import { CommandHandler, EventPublisher, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { IStorageRepository } from '@storage/domain/contracts/storage.repository.contract';
import { IStoreRoomRepository } from '@storage/domain/contracts/store-room.repository.contract';
import { StorageNotFoundError } from '@storage/domain/errors/storage-not-found.error';
import { StorageAlreadyFrozenError } from '@storage/domain/errors/storage-already-frozen.error';
import { StorageArchivedCannotBeFrozenError } from '@storage/domain/errors/storage-archived-cannot-be-frozen.error';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result, ok, err } from '@shared/domain/result';
import { FreezeStoreRoomCommand } from '@storage/application/commands/freeze-store-room/freeze-store-room.command';

export type FreezeStoreRoomResult = Result<void, DomainException>;

@CommandHandler(FreezeStoreRoomCommand)
export class FreezeStoreRoomHandler implements ICommandHandler<FreezeStoreRoomCommand> {
  constructor(
    @Inject(INJECTION_TOKENS.STORAGE_CONTRACT)
    private readonly storageRepository: IStorageRepository,
    @Inject(INJECTION_TOKENS.STORE_ROOM_CONTRACT)
    private readonly storeRoomRepository: IStoreRoomRepository,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(command: FreezeStoreRoomCommand): Promise<FreezeStoreRoomResult> {
    const aggregate = await this.storageRepository.findOrCreate(command.tenantUUID);
    const storeRoom = aggregate.findStoreRoom(command.storageUUID);

    if (!storeRoom) return err(new StorageNotFoundError(command.storageUUID));
    if (storeRoom.isFrozen()) return err(new StorageAlreadyFrozenError(command.storageUUID));
    if (storeRoom.isArchived())
      return err(new StorageArchivedCannotBeFrozenError(command.storageUUID));

    aggregate.freezeStoreRoom(command.storageUUID, command.actorUUID);

    const updated = aggregate.findStoreRoom(command.storageUUID);
    if (!updated || aggregate.id === undefined) {
      return err(new StorageNotFoundError(command.storageUUID));
    }

    await this.storeRoomRepository.save(updated, aggregate.id);

    this.eventPublisher.mergeObjectContext(aggregate);
    aggregate.commit();

    return ok(undefined);
  }
}

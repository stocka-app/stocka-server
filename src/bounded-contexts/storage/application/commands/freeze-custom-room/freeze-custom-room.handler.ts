import { CommandHandler, EventPublisher, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { IStorageRepository } from '@storage/domain/contracts/storage.repository.contract';
import { ICustomRoomRepository } from '@storage/domain/contracts/custom-room.repository.contract';
import { StorageNotFoundError } from '@storage/domain/errors/storage-not-found.error';
import { StorageAlreadyFrozenError } from '@storage/domain/errors/storage-already-frozen.error';
import { StorageArchivedCannotBeFrozenError } from '@storage/domain/errors/storage-archived-cannot-be-frozen.error';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result, ok, err } from '@shared/domain/result';
import { FreezeCustomRoomCommand } from '@storage/application/commands/freeze-custom-room/freeze-custom-room.command';

export type FreezeCustomRoomResult = Result<void, DomainException>;

@CommandHandler(FreezeCustomRoomCommand)
export class FreezeCustomRoomHandler implements ICommandHandler<FreezeCustomRoomCommand> {
  constructor(
    @Inject(INJECTION_TOKENS.STORAGE_CONTRACT)
    private readonly storageRepository: IStorageRepository,
    @Inject(INJECTION_TOKENS.CUSTOM_ROOM_CONTRACT)
    private readonly customRoomRepository: ICustomRoomRepository,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(command: FreezeCustomRoomCommand): Promise<FreezeCustomRoomResult> {
    const aggregate = await this.storageRepository.findOrCreate(command.tenantUUID);
    const customRoom = aggregate.findCustomRoom(command.storageUUID);

    if (!customRoom) return err(new StorageNotFoundError(command.storageUUID));
    if (customRoom.isFrozen()) return err(new StorageAlreadyFrozenError(command.storageUUID));
    if (customRoom.isArchived())
      return err(new StorageArchivedCannotBeFrozenError(command.storageUUID));

    aggregate.freezeCustomRoom(command.storageUUID, command.actorUUID);

    const updated = aggregate.findCustomRoom(command.storageUUID);
    if (!updated || aggregate.id === undefined) {
      return err(new StorageNotFoundError(command.storageUUID));
    }

    await this.customRoomRepository.save(updated, aggregate.id);

    this.eventPublisher.mergeObjectContext(aggregate);
    aggregate.commit();

    return ok(undefined);
  }
}

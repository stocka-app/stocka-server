import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result, err, ok } from '@shared/domain/result';
import { FreezeStoreRoomCommand } from '@storage/application/commands/freeze-store-room/freeze-store-room.command';
import { StorageItemViewMapper } from '@storage/application/mappers/storage-item-view.mapper';
import { IStorageRepository } from '@storage/domain/contracts/storage.repository.contract';
import { IStoreRoomRepository } from '@storage/domain/contracts/store-room.repository.contract';
import { StorageAlreadyFrozenError } from '@storage/domain/errors/storage-already-frozen.error';
import { StorageArchivedCannotBeFrozenError } from '@storage/domain/errors/storage-archived-cannot-be-frozen.error';
import { StorageNotFoundError } from '@storage/domain/errors/storage-not-found.error';
import { StorageFrozenEvent } from '@storage/domain/events/storage-frozen.event';
import { StorageItemView } from '@storage/domain/schemas';

export type FreezeStoreRoomResult = Result<StorageItemView, DomainException>;

@CommandHandler(FreezeStoreRoomCommand)
export class FreezeStoreRoomHandler implements ICommandHandler<FreezeStoreRoomCommand> {
  constructor(
    @Inject(INJECTION_TOKENS.STORAGE_CONTRACT)
    private readonly storageRepository: IStorageRepository,
    @Inject(INJECTION_TOKENS.STORE_ROOM_CONTRACT)
    private readonly storeRoomRepository: IStoreRoomRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: FreezeStoreRoomCommand): Promise<FreezeStoreRoomResult> {
    const storeRoom = await this.storeRoomRepository.findByUUID(command.storageUUID);

    if (!storeRoom || storeRoom.tenantUUID.toString() !== command.tenantUUID) {
      return err(new StorageNotFoundError(command.storageUUID));
    }
    if (storeRoom.isFrozen()) return err(new StorageAlreadyFrozenError(command.storageUUID));
    if (storeRoom.isArchived()) {
      return err(new StorageArchivedCannotBeFrozenError(command.storageUUID));
    }

    const storageId = await this.storageRepository.findIdByTenantUUID(command.tenantUUID);
    if (storageId === null) return err(new StorageNotFoundError(command.storageUUID));

    const updated = await this.storeRoomRepository.save(storeRoom.markFrozen(), storageId);

    this.eventBus.publish(
      new StorageFrozenEvent(command.storageUUID, command.tenantUUID, command.actorUUID),
    );

    return ok(StorageItemViewMapper.fromStoreRoom(updated));
  }
}

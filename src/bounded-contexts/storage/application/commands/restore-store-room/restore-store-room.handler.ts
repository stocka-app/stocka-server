import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result, err, ok } from '@shared/domain/result';
import { RestoreStoreRoomCommand } from '@storage/application/commands/restore-store-room/restore-store-room.command';
import { StorageItemViewMapper } from '@storage/application/mappers/storage-item-view.mapper';
import { IStorageRepository } from '@storage/domain/contracts/storage.repository.contract';
import { IStoreRoomRepository } from '@storage/domain/contracts/store-room.repository.contract';
import { StorageNotArchivedError } from '@storage/domain/errors/storage-not-archived.error';
import { StorageNotFoundError } from '@storage/domain/errors/storage-not-found.error';
import { StorageRestoredEvent } from '@storage/domain/events/storage-restored.event';
import { StorageItemView } from '@storage/domain/schemas';

export type RestoreStoreRoomResult = Result<StorageItemView, DomainException>;

@CommandHandler(RestoreStoreRoomCommand)
export class RestoreStoreRoomHandler implements ICommandHandler<RestoreStoreRoomCommand> {
  constructor(
    @Inject(INJECTION_TOKENS.STORAGE_CONTRACT)
    private readonly storageRepository: IStorageRepository,
    @Inject(INJECTION_TOKENS.STORE_ROOM_CONTRACT)
    private readonly storeRoomRepository: IStoreRoomRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: RestoreStoreRoomCommand): Promise<RestoreStoreRoomResult> {
    const storeRoom = await this.storeRoomRepository.findByUUID(command.storageUUID);

    if (!storeRoom || storeRoom.tenantUUID !== command.tenantUUID) {
      return err(new StorageNotFoundError(command.storageUUID));
    }
    if (!storeRoom.isArchived()) return err(new StorageNotArchivedError(command.storageUUID));

    const storageId = await this.storageRepository.findIdByTenantUUID(command.tenantUUID);
    if (storageId === null) return err(new StorageNotFoundError(command.storageUUID));

    const updated = await this.storeRoomRepository.save(storeRoom.markRestored(), storageId);

    this.eventBus.publish(
      new StorageRestoredEvent(command.storageUUID, command.tenantUUID, command.actorUUID),
    );

    return ok(StorageItemViewMapper.fromStoreRoom(updated));
  }
}

import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result, err, ok } from '@shared/domain/result';
import { ArchiveStoreRoomCommand } from '@storage/application/commands/archive-store-room/archive-store-room.command';
import { StorageItemViewMapper } from '@storage/application/mappers/storage-item-view.mapper';
import { IStorageRepository } from '@storage/domain/contracts/storage.repository.contract';
import { IStoreRoomRepository } from '@storage/domain/contracts/store-room.repository.contract';
import { StorageAlreadyArchivedError } from '@storage/domain/errors/storage-already-archived.error';
import { StorageNotFoundError } from '@storage/domain/errors/storage-not-found.error';
import { StorageArchivedEvent } from '@storage/domain/events/storage-archived.event';
import { StorageItemView } from '@storage/domain/schemas';

export type ArchiveStoreRoomResult = Result<StorageItemView, DomainException>;

@CommandHandler(ArchiveStoreRoomCommand)
export class ArchiveStoreRoomHandler implements ICommandHandler<ArchiveStoreRoomCommand> {
  constructor(
    @Inject(INJECTION_TOKENS.STORAGE_CONTRACT)
    private readonly storageRepository: IStorageRepository,
    @Inject(INJECTION_TOKENS.STORE_ROOM_CONTRACT)
    private readonly storeRoomRepository: IStoreRoomRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: ArchiveStoreRoomCommand): Promise<ArchiveStoreRoomResult> {
    const storeRoom = await this.storeRoomRepository.findByUUID(command.storageUUID);

    if (!storeRoom || storeRoom.tenantUUID.toString() !== command.tenantUUID) {
      return err(new StorageNotFoundError(command.storageUUID));
    }
    if (storeRoom.isArchived()) return err(new StorageAlreadyArchivedError(command.storageUUID));

    const storageId = await this.storageRepository.findIdByTenantUUID(command.tenantUUID);
    if (storageId === null) return err(new StorageNotFoundError(command.storageUUID));

    const updated = await this.storeRoomRepository.save(storeRoom.markArchived(), storageId);

    this.eventBus.publish(
      new StorageArchivedEvent(command.storageUUID, command.tenantUUID, command.actorUUID),
    );

    return ok(StorageItemViewMapper.fromStoreRoom(updated));
  }
}

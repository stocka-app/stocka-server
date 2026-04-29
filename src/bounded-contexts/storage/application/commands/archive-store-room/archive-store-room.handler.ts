import { CommandHandler, EventPublisher, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result, err, ok } from '@shared/domain/result';
import { ArchiveStoreRoomCommand } from '@storage/application/commands/archive-store-room/archive-store-room.command';
import { StorageItemViewMapper } from '@storage/application/mappers/storage-item-view.mapper';
import { IStorageRepository } from '@storage/domain/contracts/storage.repository.contract';
import { IStoreRoomRepository } from '@storage/domain/contracts/store-room.repository.contract';
import { StorageNotFoundException } from '@storage/domain/exceptions/business/storage-not-found.exception';
import { StorageItemView } from '@storage/domain/schemas';

export type ArchiveStoreRoomResult = Result<StorageItemView, DomainException>;

@CommandHandler(ArchiveStoreRoomCommand)
export class ArchiveStoreRoomHandler implements ICommandHandler<ArchiveStoreRoomCommand> {
  constructor(
    @Inject(INJECTION_TOKENS.STORAGE_CONTRACT)
    private readonly storageRepository: IStorageRepository,
    @Inject(INJECTION_TOKENS.STORE_ROOM_CONTRACT)
    private readonly storeRoomRepository: IStoreRoomRepository,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(command: ArchiveStoreRoomCommand): Promise<ArchiveStoreRoomResult> {
    const storeRoom = await this.storeRoomRepository.findByUUID(command.storageUUID);

    if (!storeRoom || storeRoom.tenantUUID.toString() !== command.tenantUUID) {
      return err(new StorageNotFoundException(command.storageUUID));
    }

    const transition = storeRoom.markArchived(command.actorUUID);
    if (transition.isErr()) return err(transition.error);

    const storageId = await this.storageRepository.findIdByTenantUUID(command.tenantUUID);
    if (storageId === null) return err(new StorageNotFoundException(command.storageUUID));

    const saved = await this.storeRoomRepository.save(storeRoom, storageId);

    this.eventPublisher.mergeObjectContext(storeRoom);
    storeRoom.commit();

    return ok(StorageItemViewMapper.fromStoreRoom(saved));
  }
}

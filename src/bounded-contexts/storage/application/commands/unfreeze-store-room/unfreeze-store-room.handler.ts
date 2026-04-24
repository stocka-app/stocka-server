import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result, err, ok } from '@shared/domain/result';
import { UnfreezeStoreRoomCommand } from '@storage/application/commands/unfreeze-store-room/unfreeze-store-room.command';
import { StorageItemViewMapper } from '@storage/application/mappers/storage-item-view.mapper';
import { IStorageRepository } from '@storage/domain/contracts/storage.repository.contract';
import { IStoreRoomRepository } from '@storage/domain/contracts/store-room.repository.contract';
import { StorageNotFoundError } from '@storage/domain/errors/storage-not-found.error';
import { StorageNotFrozenError } from '@storage/domain/errors/storage-not-frozen.error';
import { StorageReactivatedEvent } from '@storage/domain/events/storage-reactivated.event';
import { StorageItemView } from '@storage/domain/schemas';

export type UnfreezeStoreRoomResult = Result<StorageItemView, DomainException>;

@CommandHandler(UnfreezeStoreRoomCommand)
export class UnfreezeStoreRoomHandler implements ICommandHandler<UnfreezeStoreRoomCommand> {
  constructor(
    @Inject(INJECTION_TOKENS.STORAGE_CONTRACT)
    private readonly storageRepository: IStorageRepository,
    @Inject(INJECTION_TOKENS.STORE_ROOM_CONTRACT)
    private readonly storeRoomRepository: IStoreRoomRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: UnfreezeStoreRoomCommand): Promise<UnfreezeStoreRoomResult> {
    const storeRoom = await this.storeRoomRepository.findByUUID(command.storageUUID);

    if (!storeRoom || storeRoom.tenantUUID.toString() !== command.tenantUUID) {
      return err(new StorageNotFoundError(command.storageUUID));
    }
    if (!storeRoom.isFrozen()) return err(new StorageNotFrozenError(command.storageUUID));

    const storageId = await this.storageRepository.findIdByTenantUUID(command.tenantUUID);
    if (storageId === null) return err(new StorageNotFoundError(command.storageUUID));

    const updated = await this.storeRoomRepository.save(storeRoom.markUnfrozen(), storageId);

    this.eventBus.publish(
      new StorageReactivatedEvent(command.storageUUID, command.tenantUUID, command.actorUUID),
    );

    return ok(StorageItemViewMapper.fromStoreRoom(updated));
  }
}

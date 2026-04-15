import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result, err, ok } from '@shared/domain/result';
import { FreezeCustomRoomCommand } from '@storage/application/commands/freeze-custom-room/freeze-custom-room.command';
import { StorageItemViewMapper } from '@storage/application/mappers/storage-item-view.mapper';
import { ICustomRoomRepository } from '@storage/domain/contracts/custom-room.repository.contract';
import { IStorageRepository } from '@storage/domain/contracts/storage.repository.contract';
import { StorageAlreadyFrozenError } from '@storage/domain/errors/storage-already-frozen.error';
import { StorageArchivedCannotBeFrozenError } from '@storage/domain/errors/storage-archived-cannot-be-frozen.error';
import { StorageNotFoundError } from '@storage/domain/errors/storage-not-found.error';
import { StorageFrozenEvent } from '@storage/domain/events/storage-frozen.event';
import { StorageItemView } from '@storage/domain/schemas';

export type FreezeCustomRoomResult = Result<StorageItemView, DomainException>;

@CommandHandler(FreezeCustomRoomCommand)
export class FreezeCustomRoomHandler implements ICommandHandler<FreezeCustomRoomCommand> {
  constructor(
    @Inject(INJECTION_TOKENS.STORAGE_CONTRACT)
    private readonly storageRepository: IStorageRepository,
    @Inject(INJECTION_TOKENS.CUSTOM_ROOM_CONTRACT)
    private readonly customRoomRepository: ICustomRoomRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: FreezeCustomRoomCommand): Promise<FreezeCustomRoomResult> {
    const customRoom = await this.customRoomRepository.findByUUID(command.storageUUID);

    if (!customRoom || customRoom.tenantUUID !== command.tenantUUID) {
      return err(new StorageNotFoundError(command.storageUUID));
    }
    if (customRoom.isFrozen()) return err(new StorageAlreadyFrozenError(command.storageUUID));
    if (customRoom.isArchived()) {
      return err(new StorageArchivedCannotBeFrozenError(command.storageUUID));
    }

    const storageId = await this.storageRepository.findIdByTenantUUID(command.tenantUUID);
    if (storageId === null) return err(new StorageNotFoundError(command.storageUUID));

    const updated = await this.customRoomRepository.save(customRoom.markFrozen(), storageId);

    this.eventBus.publish(
      new StorageFrozenEvent(command.storageUUID, command.tenantUUID, command.actorUUID),
    );

    return ok(StorageItemViewMapper.fromCustomRoom(updated));
  }
}

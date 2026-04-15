import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result, err, ok } from '@shared/domain/result';
import { RestoreCustomRoomCommand } from '@storage/application/commands/restore-custom-room/restore-custom-room.command';
import { StorageItemViewMapper } from '@storage/application/mappers/storage-item-view.mapper';
import { ICustomRoomRepository } from '@storage/domain/contracts/custom-room.repository.contract';
import { IStorageRepository } from '@storage/domain/contracts/storage.repository.contract';
import { StorageNotArchivedError } from '@storage/domain/errors/storage-not-archived.error';
import { StorageNotFoundError } from '@storage/domain/errors/storage-not-found.error';
import { StorageRestoredEvent } from '@storage/domain/events/storage-restored.event';
import { StorageItemView } from '@storage/domain/schemas';

export type RestoreCustomRoomResult = Result<StorageItemView, DomainException>;

@CommandHandler(RestoreCustomRoomCommand)
export class RestoreCustomRoomHandler implements ICommandHandler<RestoreCustomRoomCommand> {
  constructor(
    @Inject(INJECTION_TOKENS.STORAGE_CONTRACT)
    private readonly storageRepository: IStorageRepository,
    @Inject(INJECTION_TOKENS.CUSTOM_ROOM_CONTRACT)
    private readonly customRoomRepository: ICustomRoomRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: RestoreCustomRoomCommand): Promise<RestoreCustomRoomResult> {
    const customRoom = await this.customRoomRepository.findByUUID(command.storageUUID);

    if (!customRoom || customRoom.tenantUUID !== command.tenantUUID) {
      return err(new StorageNotFoundError(command.storageUUID));
    }
    if (!customRoom.isArchived()) return err(new StorageNotArchivedError(command.storageUUID));

    const storageId = await this.storageRepository.findIdByTenantUUID(command.tenantUUID);
    if (storageId === null) return err(new StorageNotFoundError(command.storageUUID));

    const updated = await this.customRoomRepository.save(customRoom.markRestored(), storageId);

    this.eventBus.publish(
      new StorageRestoredEvent(command.storageUUID, command.tenantUUID, command.actorUUID),
    );

    return ok(StorageItemViewMapper.fromCustomRoom(updated));
  }
}

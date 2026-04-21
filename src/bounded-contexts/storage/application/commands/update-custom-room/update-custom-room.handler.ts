import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result, ok, err } from '@shared/domain/result';
import { UpdateCustomRoomCommand } from '@storage/application/commands/update-custom-room/update-custom-room.command';
import { StorageItemViewMapper } from '@storage/application/mappers/storage-item-view.mapper';
import { StorageUpdateEventsPublisher } from '@storage/application/services/storage-update-events.publisher';
import { IStorageRepository } from '@storage/domain/contracts/storage.repository.contract';
import { ICustomRoomRepository } from '@storage/domain/contracts/custom-room.repository.contract';
import { StorageNameAlreadyExistsError } from '@storage/domain/errors/storage-name-already-exists.error';
import { StorageNotFoundError } from '@storage/domain/errors/storage-not-found.error';
import { StorageItemView } from '@storage/domain/schemas';

export type UpdateCustomRoomResult = Result<StorageItemView, DomainException>;

@CommandHandler(UpdateCustomRoomCommand)
export class UpdateCustomRoomHandler implements ICommandHandler<UpdateCustomRoomCommand> {
  constructor(
    @Inject(INJECTION_TOKENS.STORAGE_CONTRACT)
    private readonly storageRepository: IStorageRepository,
    @Inject(INJECTION_TOKENS.CUSTOM_ROOM_CONTRACT)
    private readonly customRoomRepository: ICustomRoomRepository,
    private readonly updateEventsPublisher: StorageUpdateEventsPublisher,
  ) {}

  async execute(command: UpdateCustomRoomCommand): Promise<UpdateCustomRoomResult> {
    const before = await this.customRoomRepository.findByUUID(command.storageUUID);

    if (!before || before.tenantUUID.toString() !== command.tenantUUID) {
      return err(new StorageNotFoundError(command.storageUUID));
    }

    // H-07: metadata is editable in ARCHIVED (per E5.2). Type-change is still
    // blocked by ChangeXToYHandler (StorageTypeLockedWhileArchivedError) and
    // FROZEN by H-05's StorageTypeLockedWhileFrozenError.

    if (command.name !== undefined && command.name !== before.name.getValue()) {
      const nameExists = await this.storageRepository.existsActiveName(
        command.tenantUUID,
        command.name,
      );
      if (nameExists) {
        return err(new StorageNameAlreadyExistsError(command.name));
      }
    }

    const storageId = await this.storageRepository.findIdByTenantUUID(command.tenantUUID);
    if (storageId === null) return err(new StorageNotFoundError(command.storageUUID));

    const after = before.update({
      name: command.name,
      description: command.description,
      icon: command.icon,
      color: command.color,
      address: command.address,
      roomType: command.roomType,
    });
    const saved = await this.customRoomRepository.save(after, storageId);

    this.updateEventsPublisher.publish({
      uuid: command.storageUUID,
      tenantUUID: command.tenantUUID,
      actorUUID: command.actorUUID,
      before,
      after: saved,
      fields: {
        name: command.name,
        description: command.description,
        address: command.address,
        icon: command.icon,
        color: command.color,
        roomType: command.roomType,
      },
    });

    return ok(StorageItemViewMapper.fromCustomRoom(saved));
  }
}

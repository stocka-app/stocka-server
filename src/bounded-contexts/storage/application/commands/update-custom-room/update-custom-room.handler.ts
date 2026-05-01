import { CommandHandler, EventPublisher, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result, ok, err } from '@shared/domain/result';
import { UpdateCustomRoomCommand } from '@storage/application/commands/update-custom-room/update-custom-room.command';
import { StorageItemViewMapper } from '@storage/application/mappers/storage-item-view.mapper';
import { IStorageRepository } from '@storage/domain/contracts/storage.repository.contract';
import { ICustomRoomRepository } from '@storage/domain/contracts/custom-room.repository.contract';
import { StorageNameAlreadyExistsException } from '@storage/domain/exceptions/business/storage-name-already-exists.exception';
import { StorageNotFoundException } from '@storage/domain/exceptions/business/storage-not-found.exception';
import { StorageItemView } from '@storage/domain/schemas';

export type UpdateCustomRoomResult = Result<StorageItemView, DomainException>;

@CommandHandler(UpdateCustomRoomCommand)
export class UpdateCustomRoomHandler implements ICommandHandler<UpdateCustomRoomCommand> {
  constructor(
    @Inject(INJECTION_TOKENS.STORAGE_CONTRACT)
    private readonly storageRepository: IStorageRepository,
    @Inject(INJECTION_TOKENS.CUSTOM_ROOM_CONTRACT)
    private readonly customRoomRepository: ICustomRoomRepository,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(command: UpdateCustomRoomCommand): Promise<UpdateCustomRoomResult> {
    const customRoom = await this.customRoomRepository.findByUUID(command.storageUUID);

    if (!customRoom || customRoom.tenantUUID.toString() !== command.tenantUUID) {
      return err(new StorageNotFoundException(command.storageUUID));
    }

    if (command.name !== undefined && command.name !== customRoom.name.getValue()) {
      const nameExists = await this.storageRepository.existsActiveName(
        command.tenantUUID,
        command.name,
      );
      if (nameExists) {
        return err(new StorageNameAlreadyExistsException(command.name));
      }
    }

    const storageId = await this.storageRepository.findIdByTenantUUID(command.tenantUUID);
    if (storageId === null) return err(new StorageNotFoundException(command.storageUUID));

    const transition = customRoom.update(
      {
        name: command.name,
        description: command.description,
        icon: command.icon,
        color: command.color,
        address: command.address,
        roomType: command.roomType,
      },
      command.actorUUID,
    );
    if (transition.isErr()) return err(transition.error);

    const saved = await this.customRoomRepository.save(customRoom, storageId);

    this.eventPublisher.mergeObjectContext(customRoom);
    customRoom.commit();

    return ok(StorageItemViewMapper.fromCustomRoom(saved));
  }
}

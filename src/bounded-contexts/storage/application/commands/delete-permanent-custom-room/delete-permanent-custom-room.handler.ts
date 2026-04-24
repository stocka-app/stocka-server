import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result, err, ok } from '@shared/domain/result';
import { DeletePermanentCustomRoomCommand } from '@storage/application/commands/delete-permanent-custom-room/delete-permanent-custom-room.command';
import { ICustomRoomRepository } from '@storage/domain/contracts/custom-room.repository.contract';
import { StorageType } from '@storage/domain/enums/storage-type.enum';
import { StorageNotArchivedError } from '@storage/domain/errors/storage-not-archived.error';
import { StorageNotFoundError } from '@storage/domain/errors/storage-not-found.error';
import { StoragePermanentlyDeletedEvent } from '@storage/domain/events/storage-permanently-deleted.event';

export type DeletePermanentCustomRoomResult = Result<void, DomainException>;

@CommandHandler(DeletePermanentCustomRoomCommand)
export class DeletePermanentCustomRoomHandler implements ICommandHandler<DeletePermanentCustomRoomCommand> {
  constructor(
    @Inject(INJECTION_TOKENS.CUSTOM_ROOM_CONTRACT)
    private readonly customRoomRepository: ICustomRoomRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(
    command: DeletePermanentCustomRoomCommand,
  ): Promise<DeletePermanentCustomRoomResult> {
    const customRoom = await this.customRoomRepository.findByUUID(command.storageUUID);

    if (!customRoom || customRoom.tenantUUID.toString() !== command.tenantUUID) {
      return err(new StorageNotFoundError(command.storageUUID));
    }
    if (!customRoom.isArchived()) return err(new StorageNotArchivedError(command.storageUUID));

    const storageName = customRoom.name.getValue();

    await this.customRoomRepository.deleteByUUID(command.storageUUID);

    void this.eventBus.publish(
      new StoragePermanentlyDeletedEvent(
        command.storageUUID,
        command.tenantUUID,
        command.actorUUID,
        StorageType.CUSTOM_ROOM,
        storageName,
      ),
    );

    return ok(undefined);
  }
}

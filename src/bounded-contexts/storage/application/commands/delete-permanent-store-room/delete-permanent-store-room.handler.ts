import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result, err, ok } from '@shared/domain/result';
import { DeletePermanentStoreRoomCommand } from '@storage/application/commands/delete-permanent-store-room/delete-permanent-store-room.command';
import { IStoreRoomRepository } from '@storage/domain/contracts/store-room.repository.contract';
import { StorageType } from '@storage/domain/enums/storage-type.enum';
import { StorageNotArchivedError } from '@storage/domain/errors/storage-not-archived.error';
import { StorageNotFoundError } from '@storage/domain/errors/storage-not-found.error';
import { StoragePermanentlyDeletedEvent } from '@storage/domain/events/storage-permanently-deleted.event';

export type DeletePermanentStoreRoomResult = Result<void, DomainException>;

@CommandHandler(DeletePermanentStoreRoomCommand)
export class DeletePermanentStoreRoomHandler implements ICommandHandler<DeletePermanentStoreRoomCommand> {
  constructor(
    @Inject(INJECTION_TOKENS.STORE_ROOM_CONTRACT)
    private readonly storeRoomRepository: IStoreRoomRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: DeletePermanentStoreRoomCommand): Promise<DeletePermanentStoreRoomResult> {
    const storeRoom = await this.storeRoomRepository.findByUUID(command.storageUUID);

    if (!storeRoom || storeRoom.tenantUUID.toString() !== command.tenantUUID) {
      return err(new StorageNotFoundError(command.storageUUID));
    }
    if (!storeRoom.isArchived()) return err(new StorageNotArchivedError(command.storageUUID));

    const storageName = storeRoom.name.getValue();

    await this.storeRoomRepository.deleteByUUID(command.storageUUID);

    void this.eventBus.publish(
      new StoragePermanentlyDeletedEvent(
        command.storageUUID,
        command.tenantUUID,
        command.actorUUID,
        StorageType.STORE_ROOM,
        storageName,
      ),
    );

    return ok(undefined);
  }
}

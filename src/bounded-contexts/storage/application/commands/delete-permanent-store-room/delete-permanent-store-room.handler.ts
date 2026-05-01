import { CommandHandler, EventPublisher, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result, err, ok } from '@shared/domain/result';
import { DeletePermanentStoreRoomCommand } from '@storage/application/commands/delete-permanent-store-room/delete-permanent-store-room.command';
import { IStoreRoomRepository } from '@storage/domain/contracts/store-room.repository.contract';
import { StorageNotFoundException } from '@storage/domain/exceptions/business/storage-not-found.exception';

export type DeletePermanentStoreRoomResult = Result<void, DomainException>;

@CommandHandler(DeletePermanentStoreRoomCommand)
export class DeletePermanentStoreRoomHandler implements ICommandHandler<DeletePermanentStoreRoomCommand> {
  constructor(
    @Inject(INJECTION_TOKENS.STORE_ROOM_CONTRACT)
    private readonly storeRoomRepository: IStoreRoomRepository,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(command: DeletePermanentStoreRoomCommand): Promise<DeletePermanentStoreRoomResult> {
    const storeRoom = await this.storeRoomRepository.findByUUID(command.storageUUID);

    if (!storeRoom || storeRoom.tenantUUID.toString() !== command.tenantUUID) {
      return err(new StorageNotFoundException(command.storageUUID));
    }

    const transition = storeRoom.markPermanentlyDeleted(command.actorUUID);
    if (transition.isErr()) return err(transition.error);

    await this.storeRoomRepository.deleteByUUID(command.storageUUID);

    this.eventPublisher.mergeObjectContext(storeRoom);
    storeRoom.commit();

    return ok(undefined);
  }
}

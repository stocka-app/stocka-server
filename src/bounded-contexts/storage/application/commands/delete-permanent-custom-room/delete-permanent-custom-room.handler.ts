import { CommandHandler, EventPublisher, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result, err, ok } from '@shared/domain/result';
import { DeletePermanentCustomRoomCommand } from '@storage/application/commands/delete-permanent-custom-room/delete-permanent-custom-room.command';
import { ICustomRoomRepository } from '@storage/domain/contracts/custom-room.repository.contract';
import { StorageNotFoundException } from '@storage/domain/exceptions/business/storage-not-found.exception';

export type DeletePermanentCustomRoomResult = Result<void, DomainException>;

@CommandHandler(DeletePermanentCustomRoomCommand)
export class DeletePermanentCustomRoomHandler implements ICommandHandler<DeletePermanentCustomRoomCommand> {
  constructor(
    @Inject(INJECTION_TOKENS.CUSTOM_ROOM_CONTRACT)
    private readonly customRoomRepository: ICustomRoomRepository,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(
    command: DeletePermanentCustomRoomCommand,
  ): Promise<DeletePermanentCustomRoomResult> {
    const customRoom = await this.customRoomRepository.findByUUID(command.storageUUID);

    if (!customRoom || customRoom.tenantUUID.toString() !== command.tenantUUID) {
      return err(new StorageNotFoundException(command.storageUUID));
    }

    const transition = customRoom.markPermanentlyDeleted(command.actorUUID);
    if (transition.isErr()) return err(transition.error);

    await this.customRoomRepository.deleteByUUID(command.storageUUID);

    this.eventPublisher.mergeObjectContext(customRoom);
    customRoom.commit();

    return ok(undefined);
  }
}

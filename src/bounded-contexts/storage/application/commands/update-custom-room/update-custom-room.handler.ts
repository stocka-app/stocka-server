import { CommandHandler, ICommandHandler, EventPublisher } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { UpdateCustomRoomCommand } from '@storage/application/commands/update-custom-room/update-custom-room.command';
import { IStorageRepository } from '@storage/domain/contracts/storage.repository.contract';
import { ICustomRoomRepository } from '@storage/domain/contracts/custom-room.repository.contract';
import { StorageNotFoundError } from '@storage/domain/errors/storage-not-found.error';
import { StorageNameAlreadyExistsError } from '@storage/domain/errors/storage-name-already-exists.error';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result, ok, err } from '@shared/domain/result';

export type UpdateCustomRoomResult = Result<{ storageUUID: string }, DomainException>;

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
    const aggregate = await this.storageRepository.findOrCreate(command.tenantUUID);

    const customRoom = aggregate.findCustomRoom(command.storageUUID);

    if (!customRoom || customRoom.isArchived()) {
      return err(new StorageNotFoundError(command.storageUUID));
    }

    if (command.name !== undefined && command.name !== customRoom.name.getValue()) {
      const nameExists = await this.storageRepository.existsActiveName(
        command.tenantUUID,
        command.name,
      );
      if (nameExists) {
        return err(new StorageNameAlreadyExistsError(command.name));
      }
    }

    aggregate.updateCustomRoom(
      command.storageUUID,
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

    const updated = aggregate.findCustomRoom(command.storageUUID)!;
    await this.customRoomRepository.save(updated, aggregate.id!);

    this.eventPublisher.mergeObjectContext(aggregate);
    aggregate.commit();

    return ok({ storageUUID: command.storageUUID });
  }
}

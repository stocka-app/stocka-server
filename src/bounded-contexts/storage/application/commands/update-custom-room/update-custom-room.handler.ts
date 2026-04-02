import { CommandHandler, ICommandHandler, EventPublisher } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { UpdateCustomRoomCommand } from '@storage/application/commands/update-custom-room/update-custom-room.command';
import { IStorageRepository } from '@storage/domain/contracts/storage.repository.contract';
import { StorageType } from '@storage/domain/enums/storage-type.enum';
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
    private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(command: UpdateCustomRoomCommand): Promise<UpdateCustomRoomResult> {
    const storage = await this.storageRepository.findByUUID(
      command.storageUUID,
      command.tenantUUID,
    );

    if (!storage || storage.type !== StorageType.CUSTOM_ROOM || storage.isArchived()) {
      return err(new StorageNotFoundError(command.storageUUID));
    }

    if (command.name !== undefined && command.name !== storage.name) {
      const nameExists = await this.storageRepository.existsActiveName(
        command.tenantUUID,
        command.name,
      );
      if (nameExists) {
        return err(new StorageNameAlreadyExistsError(command.name));
      }
    }

    storage.updateCustomRoom({
      name: command.name,
      description: command.description,
      icon: command.icon,
      color: command.color,
      address: command.address,
      roomType: command.roomType,
    });

    const saved = await this.storageRepository.save(storage);

    this.eventPublisher.mergeObjectContext(saved);
    saved.commit();

    return ok({ storageUUID: saved.uuid });
  }
}

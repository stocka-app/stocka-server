import { CommandHandler, ICommandHandler, EventPublisher } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { UpdateStorageCommand } from '@storage/application/commands/update-storage/update-storage.command';
import { IStorageRepository } from '@storage/domain/contracts/storage.repository.contract';
import { StorageNotFoundError } from '@storage/domain/errors/storage-not-found.error';
import { StorageNameAlreadyExistsError } from '@storage/domain/errors/storage-name-already-exists.error';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result, ok, err } from '@shared/domain/result';

export type UpdateStorageResult = Result<{ storageUUID: string }, DomainException>;

@CommandHandler(UpdateStorageCommand)
export class UpdateStorageHandler implements ICommandHandler<UpdateStorageCommand> {
  constructor(
    @Inject(INJECTION_TOKENS.STORAGE_CONTRACT)
    private readonly storageRepository: IStorageRepository,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(command: UpdateStorageCommand): Promise<UpdateStorageResult> {
    const storage = await this.storageRepository.findByUUID(
      command.storageUUID,
      command.tenantUUID,
    );

    if (!storage) {
      return err(new StorageNotFoundError(command.storageUUID));
    }

    if (storage.isArchived()) {
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
      storage.updateName(command.name);
    }

    const saved = await this.storageRepository.save(storage);

    this.eventPublisher.mergeObjectContext(saved);
    saved.commit();

    return ok({ storageUUID: saved.uuid });
  }
}

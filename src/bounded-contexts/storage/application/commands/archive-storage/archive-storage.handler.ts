import { CommandHandler, ICommandHandler, EventPublisher } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { ArchiveStorageCommand } from '@storage/application/commands/archive-storage/archive-storage.command';
import { IStorageRepository } from '@storage/domain/contracts/storage.repository.contract';
import { StorageNotFoundError } from '@storage/domain/errors/storage-not-found.error';
import { StorageAlreadyArchivedError } from '@storage/domain/errors/storage-already-archived.error';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result, ok, err } from '@shared/domain/result';

export type ArchiveStorageResult = Result<void, DomainException>;

@CommandHandler(ArchiveStorageCommand)
export class ArchiveStorageHandler implements ICommandHandler<ArchiveStorageCommand> {
  constructor(
    @Inject(INJECTION_TOKENS.STORAGE_CONTRACT)
    private readonly storageRepository: IStorageRepository,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(command: ArchiveStorageCommand): Promise<ArchiveStorageResult> {
    const storage = await this.storageRepository.findByUUID(
      command.storageUUID,
      command.tenantUUID,
    );

    if (!storage) {
      return err(new StorageNotFoundError(command.storageUUID));
    }

    if (storage.isArchived()) {
      return err(new StorageAlreadyArchivedError(command.storageUUID));
    }

    storage.markArchived();

    await this.storageRepository.archive(storage);

    this.eventPublisher.mergeObjectContext(storage);
    storage.commit();

    return ok(undefined);
  }
}

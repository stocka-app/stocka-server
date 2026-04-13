import { CommandHandler, EventPublisher, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { IStorageRepository } from '@storage/domain/contracts/storage.repository.contract';
import { IWarehouseRepository } from '@storage/domain/contracts/warehouse.repository.contract';
import { StorageNotFoundError } from '@storage/domain/errors/storage-not-found.error';
import { StorageAlreadyFrozenError } from '@storage/domain/errors/storage-already-frozen.error';
import { StorageArchivedCannotBeFrozenError } from '@storage/domain/errors/storage-archived-cannot-be-frozen.error';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result, ok, err } from '@shared/domain/result';
import { FreezeWarehouseCommand } from '@storage/application/commands/freeze-warehouse/freeze-warehouse.command';

export type FreezeWarehouseResult = Result<void, DomainException>;

@CommandHandler(FreezeWarehouseCommand)
export class FreezeWarehouseHandler implements ICommandHandler<FreezeWarehouseCommand> {
  constructor(
    @Inject(INJECTION_TOKENS.STORAGE_CONTRACT)
    private readonly storageRepository: IStorageRepository,
    @Inject(INJECTION_TOKENS.WAREHOUSE_CONTRACT)
    private readonly warehouseRepository: IWarehouseRepository,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(command: FreezeWarehouseCommand): Promise<FreezeWarehouseResult> {
    const aggregate = await this.storageRepository.findOrCreate(command.tenantUUID);
    const warehouse = aggregate.findWarehouse(command.storageUUID);

    if (!warehouse) return err(new StorageNotFoundError(command.storageUUID));
    if (warehouse.isFrozen()) return err(new StorageAlreadyFrozenError(command.storageUUID));
    if (warehouse.isArchived())
      return err(new StorageArchivedCannotBeFrozenError(command.storageUUID));

    // H-05: NO check for "last active installation" — validation is client-side (ADR D-10)

    aggregate.freezeWarehouse(command.storageUUID, command.actorUUID);

    const updated = aggregate.findWarehouse(command.storageUUID);
    if (!updated || aggregate.id === undefined) {
      return err(new StorageNotFoundError(command.storageUUID));
    }

    await this.warehouseRepository.save(updated, aggregate.id);

    this.eventPublisher.mergeObjectContext(aggregate);
    aggregate.commit();

    return ok(undefined);
  }
}

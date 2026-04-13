import { CommandHandler, EventPublisher, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { IStorageRepository } from '@storage/domain/contracts/storage.repository.contract';
import { IWarehouseRepository } from '@storage/domain/contracts/warehouse.repository.contract';
import { StorageNotFoundError } from '@storage/domain/errors/storage-not-found.error';
import { StorageNotFrozenError } from '@storage/domain/errors/storage-not-frozen.error';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result, ok, err } from '@shared/domain/result';
import { UnfreezeWarehouseCommand } from '@storage/application/commands/unfreeze-warehouse/unfreeze-warehouse.command';

export type UnfreezeWarehouseResult = Result<void, DomainException>;

@CommandHandler(UnfreezeWarehouseCommand)
export class UnfreezeWarehouseHandler implements ICommandHandler<UnfreezeWarehouseCommand> {
  constructor(
    @Inject(INJECTION_TOKENS.STORAGE_CONTRACT)
    private readonly storageRepository: IStorageRepository,
    @Inject(INJECTION_TOKENS.WAREHOUSE_CONTRACT)
    private readonly warehouseRepository: IWarehouseRepository,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(command: UnfreezeWarehouseCommand): Promise<UnfreezeWarehouseResult> {
    const aggregate = await this.storageRepository.findOrCreate(command.tenantUUID);
    const warehouse = aggregate.findWarehouse(command.storageUUID);

    if (!warehouse) return err(new StorageNotFoundError(command.storageUUID));
    if (!warehouse.isFrozen()) return err(new StorageNotFrozenError(command.storageUUID));

    aggregate.unfreezeWarehouse(command.storageUUID, command.actorUUID);

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

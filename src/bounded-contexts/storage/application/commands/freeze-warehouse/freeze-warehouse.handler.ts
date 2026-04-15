import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result, err, ok } from '@shared/domain/result';
import { FreezeWarehouseCommand } from '@storage/application/commands/freeze-warehouse/freeze-warehouse.command';
import { StorageItemViewMapper } from '@storage/application/mappers/storage-item-view.mapper';
import { IStorageRepository } from '@storage/domain/contracts/storage.repository.contract';
import { IWarehouseRepository } from '@storage/domain/contracts/warehouse.repository.contract';
import { StorageAlreadyFrozenError } from '@storage/domain/errors/storage-already-frozen.error';
import { StorageArchivedCannotBeFrozenError } from '@storage/domain/errors/storage-archived-cannot-be-frozen.error';
import { StorageNotFoundError } from '@storage/domain/errors/storage-not-found.error';
import { StorageFrozenEvent } from '@storage/domain/events/storage-frozen.event';
import { StorageItemView } from '@storage/domain/schemas';

export type FreezeWarehouseResult = Result<StorageItemView, DomainException>;

@CommandHandler(FreezeWarehouseCommand)
export class FreezeWarehouseHandler implements ICommandHandler<FreezeWarehouseCommand> {
  constructor(
    @Inject(INJECTION_TOKENS.STORAGE_CONTRACT)
    private readonly storageRepository: IStorageRepository,
    @Inject(INJECTION_TOKENS.WAREHOUSE_CONTRACT)
    private readonly warehouseRepository: IWarehouseRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: FreezeWarehouseCommand): Promise<FreezeWarehouseResult> {
    const warehouse = await this.warehouseRepository.findByUUID(command.storageUUID);

    if (!warehouse || warehouse.tenantUUID !== command.tenantUUID) {
      return err(new StorageNotFoundError(command.storageUUID));
    }
    if (warehouse.isFrozen()) return err(new StorageAlreadyFrozenError(command.storageUUID));
    if (warehouse.isArchived()) {
      return err(new StorageArchivedCannotBeFrozenError(command.storageUUID));
    }

    // H-05: NO check for "last active installation" — validation is client-side (ADR D-10)

    const storageId = await this.storageRepository.findIdByTenantUUID(command.tenantUUID);
    if (storageId === null) return err(new StorageNotFoundError(command.storageUUID));

    const updated = await this.warehouseRepository.save(warehouse.markFrozen(), storageId);

    this.eventBus.publish(
      new StorageFrozenEvent(command.storageUUID, command.tenantUUID, command.actorUUID),
    );

    return ok(StorageItemViewMapper.fromWarehouse(updated));
  }
}

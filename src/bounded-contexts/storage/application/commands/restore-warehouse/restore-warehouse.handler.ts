import { CommandHandler, EventPublisher, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result, err, ok } from '@shared/domain/result';
import { RestoreWarehouseCommand } from '@storage/application/commands/restore-warehouse/restore-warehouse.command';
import { StorageItemViewMapper } from '@storage/application/mappers/storage-item-view.mapper';
import { StorageTypeChangePolicy } from '@storage/application/services/storage-type-change.policy';
import { IStorageRepository } from '@storage/domain/contracts/storage.repository.contract';
import { IWarehouseRepository } from '@storage/domain/contracts/warehouse.repository.contract';
import { StorageNotFoundError } from '@storage/domain/errors/storage-not-found.error';
import { StorageItemView } from '@storage/domain/schemas';

export type RestoreWarehouseResult = Result<StorageItemView, DomainException>;

@CommandHandler(RestoreWarehouseCommand)
export class RestoreWarehouseHandler implements ICommandHandler<RestoreWarehouseCommand> {
  constructor(
    @Inject(INJECTION_TOKENS.STORAGE_CONTRACT)
    private readonly storageRepository: IStorageRepository,
    @Inject(INJECTION_TOKENS.WAREHOUSE_CONTRACT)
    private readonly warehouseRepository: IWarehouseRepository,
    private readonly policy: StorageTypeChangePolicy,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(command: RestoreWarehouseCommand): Promise<RestoreWarehouseResult> {
    const warehouse = await this.warehouseRepository.findByUUID(command.storageUUID);

    if (!warehouse || warehouse.tenantUUID.toString() !== command.tenantUUID) {
      return err(new StorageNotFoundError(command.storageUUID));
    }

    // Tier capacity guard. Counts include archived items (state-agnostic), so in
    // normal flows this guard is a no-op: the archived item already counted before
    // the restore. The guard catches the edge case where the tenant downgraded
    // after archiving — the new tier limit may now be below the existing total,
    // blocking the restore until the user resolves the downgrade flow.
    const capacityError = await this.policy.assertWarehouseCanRestore(command.tenantUUID);
    if (capacityError) return err(capacityError);

    const transition = warehouse.markRestored(command.actorUUID);
    if (transition.isErr()) return err(transition.error);

    const storageId = await this.storageRepository.findIdByTenantUUID(command.tenantUUID);
    if (storageId === null) return err(new StorageNotFoundError(command.storageUUID));

    const saved = await this.warehouseRepository.save(warehouse, storageId);

    this.eventPublisher.mergeObjectContext(warehouse);
    warehouse.commit();

    return ok(StorageItemViewMapper.fromWarehouse(saved));
  }
}

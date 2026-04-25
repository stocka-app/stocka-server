import { CommandHandler, EventPublisher, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result, err, ok } from '@shared/domain/result';
import { UnfreezeWarehouseCommand } from '@storage/application/commands/unfreeze-warehouse/unfreeze-warehouse.command';
import { StorageItemViewMapper } from '@storage/application/mappers/storage-item-view.mapper';
import { IStorageRepository } from '@storage/domain/contracts/storage.repository.contract';
import { IWarehouseRepository } from '@storage/domain/contracts/warehouse.repository.contract';
import { StorageNotFoundError } from '@storage/domain/errors/storage-not-found.error';
import { StorageItemView } from '@storage/domain/schemas';

export type UnfreezeWarehouseResult = Result<StorageItemView, DomainException>;

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
    const warehouse = await this.warehouseRepository.findByUUID(command.storageUUID);

    if (!warehouse || warehouse.tenantUUID.toString() !== command.tenantUUID) {
      return err(new StorageNotFoundError(command.storageUUID));
    }

    const transition = warehouse.markUnfrozen(command.actorUUID);
    if (transition.isErr()) return err(transition.error);

    const storageId = await this.storageRepository.findIdByTenantUUID(command.tenantUUID);
    if (storageId === null) return err(new StorageNotFoundError(command.storageUUID));

    const saved = await this.warehouseRepository.save(warehouse, storageId);

    this.eventPublisher.mergeObjectContext(warehouse);
    warehouse.commit();

    return ok(StorageItemViewMapper.fromWarehouse(saved));
  }
}

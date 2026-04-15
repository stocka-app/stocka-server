import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result, err, ok } from '@shared/domain/result';
import { ArchiveWarehouseCommand } from '@storage/application/commands/archive-warehouse/archive-warehouse.command';
import { StorageItemViewMapper } from '@storage/application/mappers/storage-item-view.mapper';
import { IStorageRepository } from '@storage/domain/contracts/storage.repository.contract';
import { IWarehouseRepository } from '@storage/domain/contracts/warehouse.repository.contract';
import { StorageAlreadyArchivedError } from '@storage/domain/errors/storage-already-archived.error';
import { StorageNotFoundError } from '@storage/domain/errors/storage-not-found.error';
import { StorageArchivedEvent } from '@storage/domain/events/storage-archived.event';
import { StorageItemView } from '@storage/domain/schemas';

export type ArchiveWarehouseResult = Result<StorageItemView, DomainException>;

@CommandHandler(ArchiveWarehouseCommand)
export class ArchiveWarehouseHandler implements ICommandHandler<ArchiveWarehouseCommand> {
  constructor(
    @Inject(INJECTION_TOKENS.STORAGE_CONTRACT)
    private readonly storageRepository: IStorageRepository,
    @Inject(INJECTION_TOKENS.WAREHOUSE_CONTRACT)
    private readonly warehouseRepository: IWarehouseRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: ArchiveWarehouseCommand): Promise<ArchiveWarehouseResult> {
    const warehouse = await this.warehouseRepository.findByUUID(command.storageUUID);

    if (!warehouse || warehouse.tenantUUID !== command.tenantUUID) {
      return err(new StorageNotFoundError(command.storageUUID));
    }
    if (warehouse.isArchived()) return err(new StorageAlreadyArchivedError(command.storageUUID));

    // H-07: archive permitido desde ACTIVE y FROZEN. markArchived() limpia frozenAt.

    const storageId = await this.storageRepository.findIdByTenantUUID(command.tenantUUID);
    if (storageId === null) return err(new StorageNotFoundError(command.storageUUID));

    const updated = await this.warehouseRepository.save(warehouse.markArchived(), storageId);

    this.eventBus.publish(
      new StorageArchivedEvent(command.storageUUID, command.tenantUUID, command.actorUUID),
    );

    return ok(StorageItemViewMapper.fromWarehouse(updated));
  }
}

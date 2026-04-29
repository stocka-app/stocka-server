import { CommandHandler, EventPublisher, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result, ok, err } from '@shared/domain/result';
import { UpdateWarehouseCommand } from '@storage/application/commands/update-warehouse/update-warehouse.command';
import { StorageItemViewMapper } from '@storage/application/mappers/storage-item-view.mapper';
import { IStorageRepository } from '@storage/domain/contracts/storage.repository.contract';
import { IWarehouseRepository } from '@storage/domain/contracts/warehouse.repository.contract';
import { StorageAddressRequiredForWarehouseException } from '@storage/domain/exceptions/business/storage-address-required-for-warehouse.exception';
import { StorageNameAlreadyExistsException } from '@storage/domain/exceptions/business/storage-name-already-exists.exception';
import { StorageNotFoundException } from '@storage/domain/exceptions/business/storage-not-found.exception';
import { StorageItemView } from '@storage/domain/schemas';

export type UpdateWarehouseResult = Result<StorageItemView, DomainException>;

@CommandHandler(UpdateWarehouseCommand)
export class UpdateWarehouseHandler implements ICommandHandler<UpdateWarehouseCommand> {
  constructor(
    @Inject(INJECTION_TOKENS.STORAGE_CONTRACT)
    private readonly storageRepository: IStorageRepository,
    @Inject(INJECTION_TOKENS.WAREHOUSE_CONTRACT)
    private readonly warehouseRepository: IWarehouseRepository,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(command: UpdateWarehouseCommand): Promise<UpdateWarehouseResult> {
    const warehouse = await this.warehouseRepository.findByUUID(command.storageUUID);

    if (!warehouse || warehouse.tenantUUID.toString() !== command.tenantUUID) {
      return err(new StorageNotFoundException(command.storageUUID));
    }

    // H-07: metadata is editable in ARCHIVED (per E5.2). Type-change is still
    // blocked by ChangeXToYHandler (StorageTypeLockedWhileArchivedException) and
    // FROZEN by H-05's StorageTypeLockedWhileFrozenException.

    if (command.name !== undefined && command.name !== warehouse.name.getValue()) {
      const nameExists = await this.storageRepository.existsActiveName(
        command.tenantUUID,
        command.name,
      );
      if (nameExists) {
        return err(new StorageNameAlreadyExistsException(command.name));
      }
    }

    if (command.address !== undefined && command.address.trim().length === 0) {
      return err(new StorageAddressRequiredForWarehouseException(command.storageUUID));
    }

    const storageId = await this.storageRepository.findIdByTenantUUID(command.tenantUUID);
    if (storageId === null) return err(new StorageNotFoundException(command.storageUUID));

    const transition = warehouse.update(
      {
        name: command.name,
        description: command.description,
        address: command.address,
      },
      command.actorUUID,
    );
    if (transition.isErr()) return err(transition.error);

    const saved = await this.warehouseRepository.save(warehouse, storageId);

    this.eventPublisher.mergeObjectContext(warehouse);
    warehouse.commit();

    return ok(StorageItemViewMapper.fromWarehouse(saved));
  }
}

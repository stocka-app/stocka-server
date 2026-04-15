import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result, ok, err } from '@shared/domain/result';
import { UpdateWarehouseCommand } from '@storage/application/commands/update-warehouse/update-warehouse.command';
import { StorageItemViewMapper } from '@storage/application/mappers/storage-item-view.mapper';
import { StorageUpdateEventsPublisher } from '@storage/application/services/storage-update-events.publisher';
import { IStorageRepository } from '@storage/domain/contracts/storage.repository.contract';
import { IWarehouseRepository } from '@storage/domain/contracts/warehouse.repository.contract';
import { StorageAddressRequiredForWarehouseError } from '@storage/domain/errors/storage-address-required-for-warehouse.error';
import { StorageNameAlreadyExistsError } from '@storage/domain/errors/storage-name-already-exists.error';
import { StorageNotFoundError } from '@storage/domain/errors/storage-not-found.error';
import { StorageItemView } from '@storage/domain/schemas';

export type UpdateWarehouseResult = Result<StorageItemView, DomainException>;

@CommandHandler(UpdateWarehouseCommand)
export class UpdateWarehouseHandler implements ICommandHandler<UpdateWarehouseCommand> {
  constructor(
    @Inject(INJECTION_TOKENS.STORAGE_CONTRACT)
    private readonly storageRepository: IStorageRepository,
    @Inject(INJECTION_TOKENS.WAREHOUSE_CONTRACT)
    private readonly warehouseRepository: IWarehouseRepository,
    private readonly updateEventsPublisher: StorageUpdateEventsPublisher,
  ) {}

  async execute(command: UpdateWarehouseCommand): Promise<UpdateWarehouseResult> {
    const before = await this.warehouseRepository.findByUUID(command.storageUUID);

    if (!before || before.tenantUUID !== command.tenantUUID) {
      return err(new StorageNotFoundError(command.storageUUID));
    }

    // H-07: metadata is editable in ARCHIVED (per E5.2). Type-change is still
    // blocked by ChangeXToYHandler (StorageTypeLockedWhileArchivedError) and
    // FROZEN by H-05's StorageTypeLockedWhileFrozenError.

    if (command.name !== undefined && command.name !== before.name.getValue()) {
      const nameExists = await this.storageRepository.existsActiveName(
        command.tenantUUID,
        command.name,
      );
      if (nameExists) {
        return err(new StorageNameAlreadyExistsError(command.name));
      }
    }

    if (command.address !== undefined && command.address.trim().length === 0) {
      return err(new StorageAddressRequiredForWarehouseError(command.storageUUID));
    }

    const storageId = await this.storageRepository.findIdByTenantUUID(command.tenantUUID);
    if (storageId === null) return err(new StorageNotFoundError(command.storageUUID));

    const after = before.update({
      name: command.name,
      description: command.description,
      address: command.address,
    });
    const saved = await this.warehouseRepository.save(after, storageId);

    this.updateEventsPublisher.publish({
      uuid: command.storageUUID,
      tenantUUID: command.tenantUUID,
      actorUUID: command.actorUUID,
      before,
      after: saved,
      fields: {
        name: command.name,
        description: command.description,
        address: command.address,
      },
    });

    return ok(StorageItemViewMapper.fromWarehouse(saved));
  }
}

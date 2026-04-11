import { CommandHandler, ICommandHandler, EventPublisher } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { UpdateWarehouseCommand } from '@storage/application/commands/update-warehouse/update-warehouse.command';
import { IStorageRepository } from '@storage/domain/contracts/storage.repository.contract';
import { IWarehouseRepository } from '@storage/domain/contracts/warehouse.repository.contract';
import { StorageNotFoundError } from '@storage/domain/errors/storage-not-found.error';
import { StorageArchivedCannotBeUpdatedError } from '@storage/domain/errors/storage-archived-cannot-be-updated.error';
import { StorageNameAlreadyExistsError } from '@storage/domain/errors/storage-name-already-exists.error';
import { StorageAddressRequiredForWarehouseError } from '@storage/domain/errors/storage-address-required-for-warehouse.error';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result, ok, err } from '@shared/domain/result';

export type UpdateWarehouseResult = Result<{ storageUUID: string }, DomainException>;

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
    const aggregate = await this.storageRepository.findOrCreate(command.tenantUUID);

    const warehouse = aggregate.findWarehouse(command.storageUUID);

    if (!warehouse) {
      return err(new StorageNotFoundError(command.storageUUID));
    }

    if (warehouse.isArchived()) {
      return err(new StorageArchivedCannotBeUpdatedError(command.storageUUID));
    }

    if (command.name !== undefined && command.name !== warehouse.name.getValue()) {
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

    aggregate.updateWarehouse(
      command.storageUUID,
      {
        name: command.name,
        description: command.description,
        address: command.address,
      },
      command.actorUUID,
    );

    const updated = aggregate.findWarehouse(command.storageUUID);

    if (!updated || aggregate.id === undefined) {
      return err(new StorageNotFoundError(command.storageUUID));
    }

    await this.warehouseRepository.save(updated, aggregate.id);

    this.eventPublisher.mergeObjectContext(aggregate);
    aggregate.commit();

    return ok({ storageUUID: command.storageUUID });
  }
}

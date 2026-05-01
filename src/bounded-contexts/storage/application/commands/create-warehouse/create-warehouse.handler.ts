import { CommandHandler, ICommandHandler, EventPublisher } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { v7 as uuidV7 } from 'uuid';
import { CreateWarehouseCommand } from '@storage/application/commands/create-warehouse/create-warehouse.command';
import { IStorageRepository } from '@storage/domain/contracts/storage.repository.contract';
import { IWarehouseRepository } from '@storage/domain/contracts/warehouse.repository.contract';
import { ITenantCapabilitiesPort } from '@storage/application/ports/tenant-capabilities.port';
import { WarehouseAggregate } from '@storage/domain/aggregates/warehouse.aggregate';
import { StorageType } from '@storage/domain/enums/storage-type.enum';
import {
  resolveStorageIcon,
  resolveStorageColor,
} from '@storage/domain/services/storage-icon-color.resolver';
import { StorageNameAlreadyExistsException } from '@storage/domain/exceptions/business/storage-name-already-exists.exception';
import { WarehouseRequiresTierUpgradeException } from '@storage/application/errors/warehouse-requires-tier-upgrade.exception';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result, ok, err } from '@shared/domain/result';

export type CreateWarehouseResult = Result<{ storageUUID: string }, DomainException>;

@CommandHandler(CreateWarehouseCommand)
export class CreateWarehouseHandler implements ICommandHandler<CreateWarehouseCommand> {
  constructor(
    @Inject(INJECTION_TOKENS.STORAGE_CONTRACT)
    private readonly storageRepository: IStorageRepository,
    @Inject(INJECTION_TOKENS.WAREHOUSE_CONTRACT)
    private readonly warehouseRepository: IWarehouseRepository,
    @Inject(INJECTION_TOKENS.TENANT_CAPABILITIES_PORT)
    private readonly capabilitiesPort: ITenantCapabilitiesPort,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(command: CreateWarehouseCommand): Promise<CreateWarehouseResult> {
    const capabilities = await this.capabilitiesPort.getCapabilities(command.tenantUUID);

    if (!capabilities.canCreateWarehouse()) {
      return err(new WarehouseRequiresTierUpgradeException());
    }

    const currentCount = await this.warehouseRepository.count(command.tenantUUID);

    if (!capabilities.canCreateMoreWarehouses(currentCount)) {
      return err(new WarehouseRequiresTierUpgradeException());
    }

    const nameExists = await this.storageRepository.existsActiveName(
      command.tenantUUID,
      command.name,
    );

    if (nameExists) {
      return err(new StorageNameAlreadyExistsException(command.name));
    }

    const container = await this.storageRepository.findOrCreate(command.tenantUUID);
    if (container.id === undefined) {
      throw new Error('Storage container persisted without id; repository invariant violated');
    }

    const warehouse = WarehouseAggregate.create({
      uuid: uuidV7(),
      tenantUUID: command.tenantUUID,
      actorUUID: command.actorUUID,
      name: command.name,
      description: command.description,
      icon: resolveStorageIcon(StorageType.WAREHOUSE),
      color: resolveStorageColor(StorageType.WAREHOUSE),
      address: command.address,
    });

    await this.warehouseRepository.save(warehouse, container.id);

    this.eventPublisher.mergeObjectContext(warehouse);
    warehouse.commit();

    return ok({ storageUUID: warehouse.uuid });
  }
}

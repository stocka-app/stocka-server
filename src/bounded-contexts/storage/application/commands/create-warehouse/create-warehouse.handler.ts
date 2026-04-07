import { CommandHandler, ICommandHandler, EventPublisher } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { v7 as uuidV7 } from 'uuid';
import { CreateWarehouseCommand } from '@storage/application/commands/create-warehouse/create-warehouse.command';
import { IStorageRepository } from '@storage/domain/contracts/storage.repository.contract';
import { IWarehouseRepository } from '@storage/domain/contracts/warehouse.repository.contract';
import { ITenantCapabilitiesPort } from '@storage/application/ports/tenant-capabilities.port';
import { WarehouseModel } from '@storage/domain/models/warehouse.model';
import { StorageType } from '@storage/domain/enums/storage-type.enum';
import {
  resolveStorageIcon,
  resolveStorageColor,
} from '@storage/domain/services/storage-icon-color.resolver';
import { StorageNameAlreadyExistsError } from '@storage/domain/errors/storage-name-already-exists.error';
import { WarehouseRequiresTierUpgradeError } from '@storage/application/errors/warehouse-requires-tier-upgrade.error';
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
      return err(new WarehouseRequiresTierUpgradeError());
    }

    const currentCount = await this.warehouseRepository.count(command.tenantUUID);

    if (!capabilities.canCreateMoreWarehouses(currentCount)) {
      return err(new WarehouseRequiresTierUpgradeError());
    }

    const nameExists = await this.storageRepository.existsActiveName(
      command.tenantUUID,
      command.name,
    );

    if (nameExists) {
      return err(new StorageNameAlreadyExistsError(command.name));
    }

    const aggregate = await this.storageRepository.findOrCreate(command.tenantUUID);

    const model = WarehouseModel.create({
      uuid: uuidV7(),
      tenantUUID: command.tenantUUID,
      name: command.name,
      description: command.description,
      icon: resolveStorageIcon(StorageType.WAREHOUSE),
      color: resolveStorageColor(StorageType.WAREHOUSE),
      address: command.address,
    });

    aggregate.addWarehouse(model, command.actorUUID);

    await this.warehouseRepository.save(model, aggregate.id!);

    this.eventPublisher.mergeObjectContext(aggregate);
    aggregate.commit();

    return ok({ storageUUID: model.uuid.toString() });
  }
}

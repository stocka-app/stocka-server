import { CommandHandler, ICommandHandler, EventPublisher } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { CreateStorageCommand } from '@storage/application/commands/create-storage/create-storage.command';
import { IStorageRepository } from '@storage/domain/contracts/storage.repository.interface';
import { ITenantCapabilitiesPort } from '@storage/application/ports/tenant-capabilities.port';
import { StorageAggregate } from '@storage/domain/aggregates/storage.aggregate';
import { StorageType } from '@storage/domain/enums/storage-type.enum';
import { StorageNameAlreadyExistsError } from '@storage/domain/errors/storage-name-already-exists.error';
import { CustomRoomLimitReachedError } from '@storage/application/errors/custom-room-limit-reached.error';
import { StoreRoomLimitReachedError } from '@storage/application/errors/store-room-limit-reached.error';
import { WarehouseRequiresTierUpgradeError } from '@storage/application/errors/warehouse-requires-tier-upgrade.error';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result, ok, err } from '@shared/domain/result';

export type CreateStorageResult = Result<{ storageUUID: string }, DomainException>;

@CommandHandler(CreateStorageCommand)
export class CreateStorageHandler implements ICommandHandler<CreateStorageCommand> {
  constructor(
    @Inject(INJECTION_TOKENS.STORAGE_CONTRACT)
    private readonly storageRepository: IStorageRepository,
    @Inject(INJECTION_TOKENS.TENANT_CAPABILITIES_PORT)
    private readonly capabilitiesPort: ITenantCapabilitiesPort,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(command: CreateStorageCommand): Promise<CreateStorageResult> {
    const capabilities = await this.capabilitiesPort.getCapabilities(command.tenantUUID);

    const tierCheckResult = await this.checkTierLimits(
      command.type,
      command.tenantUUID,
      capabilities,
    );
    if (tierCheckResult) {
      return err(tierCheckResult);
    }

    const nameExists = await this.storageRepository.existsActiveName(
      command.tenantUUID,
      command.name,
    );
    if (nameExists) {
      return err(new StorageNameAlreadyExistsError(command.name));
    }

    const aggregate = this.buildAggregate(command);

    const saved = await this.storageRepository.save(aggregate);

    this.eventPublisher.mergeObjectContext(saved);
    saved.commit();

    return ok({ storageUUID: saved.uuid });
  }

  private async checkTierLimits(
    type: StorageType,
    tenantUUID: string,
    capabilities: {
      canCreateWarehouse(): boolean;
      canCreateMoreWarehouses(count: number): boolean;
      canCreateMoreCustomRooms(count: number): boolean;
      canCreateMoreStoreRooms(count: number): boolean;
    },
  ): Promise<DomainException | null> {
    if (type === StorageType.WAREHOUSE) {
      if (!capabilities.canCreateWarehouse()) {
        return new WarehouseRequiresTierUpgradeError();
      }
      const warehouseCount = await this.storageRepository.countActiveByType(
        tenantUUID,
        StorageType.WAREHOUSE,
      );
      if (!capabilities.canCreateMoreWarehouses(warehouseCount)) {
        return new WarehouseRequiresTierUpgradeError();
      }
    }

    if (type === StorageType.CUSTOM_ROOM) {
      const currentCount = await this.storageRepository.countActiveByType(
        tenantUUID,
        StorageType.CUSTOM_ROOM,
      );
      if (!capabilities.canCreateMoreCustomRooms(currentCount)) {
        return new CustomRoomLimitReachedError();
      }
    }

    if (type === StorageType.STORE_ROOM) {
      const currentCount = await this.storageRepository.countActiveByType(
        tenantUUID,
        StorageType.STORE_ROOM,
      );
      if (!capabilities.canCreateMoreStoreRooms(currentCount)) {
        return new StoreRoomLimitReachedError();
      }
    }

    return null;
  }

  private buildAggregate(command: CreateStorageCommand): StorageAggregate {
    switch (command.type) {
      case StorageType.CUSTOM_ROOM:
        return StorageAggregate.createCustomRoom({
          tenantUUID: command.tenantUUID,
          name: command.name,
          roomType: command.roomType ?? 'General',
          address: command.address,
        });
      case StorageType.STORE_ROOM:
        return StorageAggregate.createStoreRoom({
          tenantUUID: command.tenantUUID,
          name: command.name,
          address: command.address,
        });
      case StorageType.WAREHOUSE:
        return StorageAggregate.createWarehouse({
          tenantUUID: command.tenantUUID,
          name: command.name,
          address: command.address as string,
        });
    }
  }
}

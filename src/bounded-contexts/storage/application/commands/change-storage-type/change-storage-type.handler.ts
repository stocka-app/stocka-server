import { CommandHandler, ICommandHandler, EventPublisher } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { ChangeStorageTypeCommand } from '@storage/application/commands/change-storage-type/change-storage-type.command';
import { IStorageRepository } from '@storage/domain/contracts/storage.repository.contract';
import { IWarehouseRepository } from '@storage/domain/contracts/warehouse.repository.contract';
import { IStoreRoomRepository } from '@storage/domain/contracts/store-room.repository.contract';
import { ICustomRoomRepository } from '@storage/domain/contracts/custom-room.repository.contract';
import { ITenantCapabilitiesPort } from '@storage/application/ports/tenant-capabilities.port';
import { StorageType } from '@storage/domain/enums/storage-type.enum';
import { WarehouseModel } from '@storage/domain/models/warehouse.model';
import { StoreRoomModel } from '@storage/domain/models/store-room.model';
import { CustomRoomModel } from '@storage/domain/models/custom-room.model';
import {
  resolveStorageIcon,
  resolveStorageColor,
} from '@storage/domain/services/storage-icon-color.resolver';
import { StorageNotFoundError } from '@storage/domain/errors/storage-not-found.error';
import { StorageArchivedCannotBeUpdatedError } from '@storage/domain/errors/storage-archived-cannot-be-updated.error';
import { StorageTypeLockedWhileFrozenError } from '@storage/domain/errors/storage-type-locked-while-frozen.error';
import { StorageAddressRequiredForWarehouseError } from '@storage/domain/errors/storage-address-required-for-warehouse.error';
import { WarehouseRequiresTierUpgradeError } from '@storage/application/errors/warehouse-requires-tier-upgrade.error';
import { StoreRoomLimitReachedError } from '@storage/application/errors/store-room-limit-reached.error';
import { CustomRoomLimitReachedError } from '@storage/application/errors/custom-room-limit-reached.error';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result, ok, err } from '@shared/domain/result';

export type ChangeStorageTypeResult = Result<{ storageUUID: string }, DomainException>;

interface ResolvedStorage {
  uuid: string;
  currentType: StorageType;
  name: string;
  description: string | null;
  address: string;
  icon: string;
  color: string;
  roomType: string | null;
  isArchived: boolean;
  isFrozen: boolean;
}

@CommandHandler(ChangeStorageTypeCommand)
export class ChangeStorageTypeHandler implements ICommandHandler<ChangeStorageTypeCommand> {
  constructor(
    @Inject(INJECTION_TOKENS.STORAGE_CONTRACT)
    private readonly storageRepository: IStorageRepository,
    @Inject(INJECTION_TOKENS.WAREHOUSE_CONTRACT)
    private readonly warehouseRepository: IWarehouseRepository,
    @Inject(INJECTION_TOKENS.STORE_ROOM_CONTRACT)
    private readonly storeRoomRepository: IStoreRoomRepository,
    @Inject(INJECTION_TOKENS.CUSTOM_ROOM_CONTRACT)
    private readonly customRoomRepository: ICustomRoomRepository,
    @Inject(INJECTION_TOKENS.TENANT_CAPABILITIES_PORT)
    private readonly capabilitiesPort: ITenantCapabilitiesPort,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(command: ChangeStorageTypeCommand): Promise<ChangeStorageTypeResult> {
    const aggregate = await this.storageRepository.findOrCreate(command.tenantUUID);

    if (aggregate.id === undefined) {
      return err(new StorageNotFoundError(command.storageUUID));
    }

    const resolved = this.resolveStorage(aggregate, command.storageUUID);

    if (!resolved) {
      return err(new StorageNotFoundError(command.storageUUID));
    }

    if (resolved.isArchived) {
      return err(new StorageArchivedCannotBeUpdatedError(command.storageUUID));
    }

    if (resolved.isFrozen) {
      return err(new StorageTypeLockedWhileFrozenError(command.storageUUID));
    }

    if (resolved.currentType === command.targetType) {
      return ok({ storageUUID: command.storageUUID });
    }

    // Validate address required for warehouse target
    if (command.targetType === StorageType.WAREHOUSE && resolved.address.trim().length === 0) {
      return err(new StorageAddressRequiredForWarehouseError(command.storageUUID));
    }

    // Validate tier limits for target type
    const tierError = await this.checkTierLimit(command.tenantUUID, command.targetType);
    if (tierError) {
      return err(tierError);
    }

    // Delete from source
    await this.deleteFromSource(resolved.currentType, command.storageUUID);

    // Create in target with same UUID
    const targetIcon =
      command.targetType === StorageType.CUSTOM_ROOM
        ? resolved.icon
        : resolveStorageIcon(command.targetType);
    const targetColor =
      command.targetType === StorageType.CUSTOM_ROOM
        ? resolved.color
        : resolveStorageColor(command.targetType);

    await this.createInTarget(
      command.targetType,
      {
        uuid: resolved.uuid,
        tenantUUID: command.tenantUUID,
        name: resolved.name,
        description: resolved.description ?? undefined,
        address: resolved.address,
        icon: targetIcon,
        color: targetColor,
        roomType: resolved.roomType ?? 'General',
      },
      aggregate.id,
      command.actorUUID,
      aggregate,
    );

    this.eventPublisher.mergeObjectContext(aggregate);
    aggregate.commit();

    return ok({ storageUUID: command.storageUUID });
  }

  private resolveStorage(
    aggregate: import('@storage/domain/aggregates/storage.aggregate').StorageAggregate,
    uuid: string,
  ): ResolvedStorage | null {
    const warehouse = aggregate.findWarehouse(uuid);
    if (warehouse) {
      return {
        uuid: warehouse.uuid.toString(),
        currentType: StorageType.WAREHOUSE,
        name: warehouse.name.getValue(),
        description: warehouse.description?.getValue() ?? null,
        address: warehouse.address.getValue(),
        icon: warehouse.icon.getValue(),
        color: warehouse.color.getValue(),
        roomType: null,
        isArchived: warehouse.isArchived(),
        isFrozen: warehouse.isFrozen(),
      };
    }

    const storeRoom = aggregate.findStoreRoom(uuid);
    if (storeRoom) {
      return {
        uuid: storeRoom.uuid.toString(),
        currentType: StorageType.STORE_ROOM,
        name: storeRoom.name.getValue(),
        description: storeRoom.description?.getValue() ?? null,
        address: storeRoom.address.getValue(),
        icon: storeRoom.icon.getValue(),
        color: storeRoom.color.getValue(),
        roomType: null,
        isArchived: storeRoom.isArchived(),
        isFrozen: storeRoom.isFrozen(),
      };
    }

    const customRoom = aggregate.findCustomRoom(uuid);
    if (customRoom) {
      return {
        uuid: customRoom.uuid.toString(),
        currentType: StorageType.CUSTOM_ROOM,
        name: customRoom.name.getValue(),
        description: customRoom.description?.getValue() ?? null,
        address: customRoom.address.getValue(),
        icon: customRoom.icon.getValue(),
        color: customRoom.color.getValue(),
        roomType: customRoom.roomType.getValue(),
        isArchived: customRoom.isArchived(),
        isFrozen: customRoom.isFrozen(),
      };
    }

    return null;
  }

  private async checkTierLimit(
    tenantUUID: string,
    targetType: StorageType,
  ): Promise<DomainException | null> {
    const capabilities = await this.capabilitiesPort.getCapabilities(tenantUUID);

    if (targetType === StorageType.WAREHOUSE) {
      if (!capabilities.canCreateWarehouse()) {
        return new WarehouseRequiresTierUpgradeError();
      }
      const count = await this.warehouseRepository.count(tenantUUID);
      if (!capabilities.canCreateMoreWarehouses(count)) {
        return new WarehouseRequiresTierUpgradeError();
      }
    }

    if (targetType === StorageType.STORE_ROOM) {
      const count = await this.storeRoomRepository.count(tenantUUID);
      if (!capabilities.canCreateMoreStoreRooms(count)) {
        return new StoreRoomLimitReachedError();
      }
    }

    if (targetType === StorageType.CUSTOM_ROOM) {
      const count = await this.customRoomRepository.count(tenantUUID);
      if (!capabilities.canCreateMoreCustomRooms(count)) {
        return new CustomRoomLimitReachedError();
      }
    }

    return null;
  }

  private async deleteFromSource(sourceType: StorageType, uuid: string): Promise<void> {
    switch (sourceType) {
      case StorageType.WAREHOUSE:
        await this.warehouseRepository.deleteByUUID(uuid);
        break;
      case StorageType.STORE_ROOM:
        await this.storeRoomRepository.deleteByUUID(uuid);
        break;
      case StorageType.CUSTOM_ROOM:
        await this.customRoomRepository.deleteByUUID(uuid);
        break;
    }
  }

  private async createInTarget(
    targetType: StorageType,
    data: {
      uuid: string;
      tenantUUID: string;
      name: string;
      description?: string;
      address: string;
      icon: string;
      color: string;
      roomType: string;
    },
    storageId: number,
    actorUUID: string,
    aggregate: import('@storage/domain/aggregates/storage.aggregate').StorageAggregate,
  ): Promise<void> {
    switch (targetType) {
      case StorageType.WAREHOUSE: {
        const model = WarehouseModel.create(data);
        aggregate.addWarehouse(model, actorUUID);
        await this.warehouseRepository.save(model, storageId);
        break;
      }
      case StorageType.STORE_ROOM: {
        const model = StoreRoomModel.create(data);
        aggregate.addStoreRoom(model, actorUUID);
        await this.storeRoomRepository.save(model, storageId);
        break;
      }
      case StorageType.CUSTOM_ROOM: {
        const model = CustomRoomModel.create(data);
        aggregate.addCustomRoom(model, actorUUID);
        await this.customRoomRepository.save(model, storageId);
        break;
      }
    }
  }
}

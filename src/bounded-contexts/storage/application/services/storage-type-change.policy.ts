import { Inject, Injectable } from '@nestjs/common';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { ITenantCapabilitiesPort } from '@storage/application/ports/tenant-capabilities.port';
import { CustomRoomLimitReachedError } from '@storage/application/errors/custom-room-limit-reached.error';
import { StoreRoomLimitReachedError } from '@storage/application/errors/store-room-limit-reached.error';
import { WarehouseRequiresTierUpgradeError } from '@storage/application/errors/warehouse-requires-tier-upgrade.error';
import { ICustomRoomRepository } from '@storage/domain/contracts/custom-room.repository.contract';
import { IStoreRoomRepository } from '@storage/domain/contracts/store-room.repository.contract';
import { IWarehouseRepository } from '@storage/domain/contracts/warehouse.repository.contract';
import { StorageAddressRequiredForWarehouseError } from '@storage/domain/errors/storage-address-required-for-warehouse.error';

/**
 * Cross-cutting validations for storage type-change handlers.
 * Each per-transition handler reuses the relevant guard via this policy
 * — keeps handlers focused on their single transition while sharing
 * tier/address/capacity rules.
 */
@Injectable()
export class StorageTypeChangePolicy {
  constructor(
    @Inject(INJECTION_TOKENS.TENANT_CAPABILITIES_PORT)
    private readonly capabilitiesPort: ITenantCapabilitiesPort,
    @Inject(INJECTION_TOKENS.WAREHOUSE_CONTRACT)
    private readonly warehouseRepository: IWarehouseRepository,
    @Inject(INJECTION_TOKENS.STORE_ROOM_CONTRACT)
    private readonly storeRoomRepository: IStoreRoomRepository,
    @Inject(INJECTION_TOKENS.CUSTOM_ROOM_CONTRACT)
    private readonly customRoomRepository: ICustomRoomRepository,
  ) {}

  /** Verify the tenant can host one more warehouse. */
  async assertWarehouseCapacity(tenantUUID: string): Promise<DomainException | null> {
    const capabilities = await this.capabilitiesPort.getCapabilities(tenantUUID);
    if (!capabilities.canCreateWarehouse()) return new WarehouseRequiresTierUpgradeError();
    const count = await this.warehouseRepository.count(tenantUUID);
    if (!capabilities.canCreateMoreWarehouses(count))
      return new WarehouseRequiresTierUpgradeError();
    return null;
  }

  async assertStoreRoomCapacity(tenantUUID: string): Promise<DomainException | null> {
    const capabilities = await this.capabilitiesPort.getCapabilities(tenantUUID);
    const count = await this.storeRoomRepository.count(tenantUUID);
    if (!capabilities.canCreateMoreStoreRooms(count)) return new StoreRoomLimitReachedError();
    return null;
  }

  async assertCustomRoomCapacity(tenantUUID: string): Promise<DomainException | null> {
    const capabilities = await this.capabilitiesPort.getCapabilities(tenantUUID);
    const count = await this.customRoomRepository.count(tenantUUID);
    if (!capabilities.canCreateMoreCustomRooms(count)) return new CustomRoomLimitReachedError();
    return null;
  }

  /** Address is mandatory when the destination type is WAREHOUSE. */
  assertAddressForWarehouse(address: string, storageUUID: string): DomainException | null {
    if (address.trim().length === 0) {
      return new StorageAddressRequiredForWarehouseError(storageUUID);
    }
    return null;
  }
}

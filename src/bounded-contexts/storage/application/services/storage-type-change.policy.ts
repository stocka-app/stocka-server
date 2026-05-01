import { Inject, Injectable } from '@nestjs/common';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { ITenantCapabilitiesPort } from '@storage/application/ports/tenant-capabilities.port';
import { CustomRoomLimitReachedException } from '@storage/application/errors/custom-room-limit-reached.exception';
import { StoreRoomLimitReachedException } from '@storage/application/errors/store-room-limit-reached.exception';
import { WarehouseRequiresTierUpgradeException } from '@storage/application/errors/warehouse-requires-tier-upgrade.exception';
import { ICustomRoomRepository } from '@storage/domain/contracts/custom-room.repository.contract';
import { IStoreRoomRepository } from '@storage/domain/contracts/store-room.repository.contract';
import { IWarehouseRepository } from '@storage/domain/contracts/warehouse.repository.contract';
import { StorageAddressRequiredForWarehouseException } from '@storage/domain/exceptions/business/storage-address-required-for-warehouse.exception';

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
    if (!capabilities.canCreateWarehouse()) return new WarehouseRequiresTierUpgradeException();
    const count = await this.warehouseRepository.count(tenantUUID);
    if (!capabilities.canCreateMoreWarehouses(count))
      return new WarehouseRequiresTierUpgradeException();
    return null;
  }

  async assertStoreRoomCapacity(tenantUUID: string): Promise<DomainException | null> {
    const capabilities = await this.capabilitiesPort.getCapabilities(tenantUUID);
    const count = await this.storeRoomRepository.count(tenantUUID);
    if (!capabilities.canCreateMoreStoreRooms(count)) return new StoreRoomLimitReachedException();
    return null;
  }

  async assertCustomRoomCapacity(tenantUUID: string): Promise<DomainException | null> {
    const capabilities = await this.capabilitiesPort.getCapabilities(tenantUUID);
    const count = await this.customRoomRepository.count(tenantUUID);
    if (!capabilities.canCreateMoreCustomRooms(count)) return new CustomRoomLimitReachedException();
    return null;
  }

  /**
   * Restore-flow capacity guards. Restore is a state flip — the archived
   * item is already counted toward the tier limit (count() runs with
   * withDeleted: true). Restoring does NOT change the total, so being
   * exactly at the limit must not block. Only a strict overflow
   * (count > max, possible after a downgrade) blocks the restore.
   */
  async assertWarehouseCanRestore(tenantUUID: string): Promise<DomainException | null> {
    const capabilities = await this.capabilitiesPort.getCapabilities(tenantUUID);
    if (!capabilities.canCreateWarehouse()) return new WarehouseRequiresTierUpgradeException();
    const count = await this.warehouseRepository.count(tenantUUID);
    if (capabilities.exceedsWarehouseLimit(count)) return new WarehouseRequiresTierUpgradeException();
    return null;
  }

  async assertStoreRoomCanRestore(tenantUUID: string): Promise<DomainException | null> {
    const capabilities = await this.capabilitiesPort.getCapabilities(tenantUUID);
    const count = await this.storeRoomRepository.count(tenantUUID);
    if (capabilities.exceedsStoreRoomLimit(count)) return new StoreRoomLimitReachedException();
    return null;
  }

  async assertCustomRoomCanRestore(tenantUUID: string): Promise<DomainException | null> {
    const capabilities = await this.capabilitiesPort.getCapabilities(tenantUUID);
    const count = await this.customRoomRepository.count(tenantUUID);
    if (capabilities.exceedsCustomRoomLimit(count)) return new CustomRoomLimitReachedException();
    return null;
  }

  /** Address is mandatory when the destination type is WAREHOUSE. */
  assertAddressForWarehouse(address: string, storageUUID: string): DomainException | null {
    if (address.trim().length === 0) {
      return new StorageAddressRequiredForWarehouseException(storageUUID);
    }
    return null;
  }
}

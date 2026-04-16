import { Injectable } from '@nestjs/common';
import {
  ITenantCapabilitiesPort,
  TenantCapabilities,
} from '@storage/application/ports/tenant-capabilities.port';
import { MediatorService } from '@shared/infrastructure/mediator/mediator.service';

class TenantCapabilitiesImpl implements TenantCapabilities {
  constructor(
    private readonly maxWarehouses: number,
    private readonly maxCustomRooms: number,
    private readonly maxStoreRooms: number,
  ) {}

  canCreateWarehouse(): boolean {
    return this.maxWarehouses !== 0;
  }

  canCreateMoreWarehouses(currentCount: number): boolean {
    if (this.maxWarehouses === -1) return true;
    return currentCount < this.maxWarehouses;
  }

  canCreateMoreCustomRooms(currentCount: number): boolean {
    if (this.maxCustomRooms === -1) return true;
    return currentCount < this.maxCustomRooms;
  }

  canCreateMoreStoreRooms(currentCount: number): boolean {
    if (this.maxStoreRooms === -1) return true;
    return currentCount < this.maxStoreRooms;
  }

  exceedsWarehouseLimit(currentCount: number): boolean {
    if (this.maxWarehouses === -1) return false;
    return currentCount > this.maxWarehouses;
  }

  exceedsStoreRoomLimit(currentCount: number): boolean {
    if (this.maxStoreRooms === -1) return false;
    return currentCount > this.maxStoreRooms;
  }

  exceedsCustomRoomLimit(currentCount: number): boolean {
    if (this.maxCustomRooms === -1) return false;
    return currentCount > this.maxCustomRooms;
  }
}

@Injectable()
export class TenantCapabilitiesAdapter implements ITenantCapabilitiesPort {
  constructor(private readonly mediator: MediatorService) {}

  async getCapabilities(tenantUUID: string): Promise<TenantCapabilities> {
    const limits = await this.mediator.tenant.getTierLimitsByTenantUUID(tenantUUID);

    if (!limits) {
      return new TenantCapabilitiesImpl(0, 1, 1);
    }

    return new TenantCapabilitiesImpl(
      limits.maxWarehouses,
      limits.maxCustomRooms,
      limits.maxStoreRooms,
    );
  }
}

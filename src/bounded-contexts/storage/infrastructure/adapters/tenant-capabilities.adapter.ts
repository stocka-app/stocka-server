import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  ITenantCapabilitiesPort,
  TenantCapabilities,
} from '@storage/application/ports/tenant-capabilities.port';

interface TenantConfigRow {
  tier: string;
  max_warehouses: number;
  max_custom_rooms: number;
  max_store_rooms: number;
}

class TenantCapabilitiesImpl implements TenantCapabilities {
  constructor(
    private readonly tier: string,
    private readonly maxWarehouses: number,
    private readonly maxCustomRooms: number,
    private readonly maxStoreRooms: number,
  ) {}

  canCreateWarehouse(): boolean {
    return this.tier !== 'FREE' && this.maxWarehouses !== 0;
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
}

@Injectable()
export class TenantCapabilitiesAdapter implements ITenantCapabilitiesPort {
  constructor(private readonly dataSource: DataSource) {}

  async getCapabilities(tenantUUID: string): Promise<TenantCapabilities> {
    const rows: TenantConfigRow[] = await this.dataSource.query(
      `SELECT tc.tier, tc.max_warehouses, tc.max_custom_rooms, tc.max_store_rooms
       FROM tenant_config tc
       JOIN tenants t ON t.id = tc.tenant_id
       WHERE t.uuid = $1`,
      [tenantUUID],
    );

    if (rows.length === 0) {
      return new TenantCapabilitiesImpl('FREE', 0, 1, 1);
    }

    const row = rows[0];
    return new TenantCapabilitiesImpl(
      row.tier,
      row.max_warehouses,
      row.max_custom_rooms,
      row.max_store_rooms,
    );
  }
}

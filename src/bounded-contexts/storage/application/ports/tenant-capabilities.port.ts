export interface TenantCapabilities {
  canCreateWarehouse(): boolean;
  canCreateMoreWarehouses(currentCount: number): boolean;
  canCreateMoreCustomRooms(currentCount: number): boolean;
  canCreateMoreStoreRooms(currentCount: number): boolean;
}

export interface ITenantCapabilitiesPort {
  getCapabilities(tenantUUID: string): Promise<TenantCapabilities>;
}

export interface TenantCapabilities {
  canCreateWarehouse(): boolean;
  canCreateMoreWarehouses(currentCount: number): boolean;
  canCreateMoreCustomRooms(currentCount: number): boolean;
  canCreateMoreStoreRooms(currentCount: number): boolean;
  /**
   * True when the current count is strictly above the tier limit
   * (post-downgrade overflow). Used by restore flows: restoring is a state
   * flip and does not increase the count, so being exactly at the limit
   * must NOT block — only a real overflow does.
   */
  exceedsWarehouseLimit(currentCount: number): boolean;
  exceedsStoreRoomLimit(currentCount: number): boolean;
  exceedsCustomRoomLimit(currentCount: number): boolean;
}

export interface ITenantCapabilitiesPort {
  getCapabilities(tenantUUID: string): Promise<TenantCapabilities>;
}

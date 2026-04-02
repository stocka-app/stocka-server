export interface CreateTenantFacadeProps {
  userUUID: string;
  userId: number;
  name: string;
  businessType: string;
  country?: string;
  timezone?: string;
}

export interface TenantMembershipContext {
  tenantUUID: string;
  role: string;
  tenantStatus: string;
  tier: string;
  usageCounts: {
    storageCount: number;
    memberCount: number;
    productCount: number;
  };
}

export interface TierLimits {
  tier: string;
  maxCustomRooms: number;
  maxStoreRooms: number;
  maxWarehouses: number;
}

export interface ITenantFacade {
  getActiveMembership(userUUID: string): Promise<{ tenantUUID: string; role: string } | null>;
  getMembershipContext(userUUID: string): Promise<TenantMembershipContext | null>;
  getTierLimits(userUUID: string): Promise<TierLimits | null>;
  getTierLimitsByTenantUUID(tenantUUID: string): Promise<TierLimits | null>;
  createTenantForUser(props: CreateTenantFacadeProps): Promise<{ tenantUUID: string }>;
}

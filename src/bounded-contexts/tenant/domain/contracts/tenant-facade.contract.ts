export interface CreateTenantFacadeProps {
  userUUID: string;
  userId: number;
  name: string;
  businessType: string;
  country?: string;
  timezone?: string;
}

export interface ITenantFacade {
  getActiveMembership(userUUID: string): Promise<{ tenantUUID: string; role: string } | null>;
  createTenantForUser(props: CreateTenantFacadeProps): Promise<{ tenantUUID: string }>;
}

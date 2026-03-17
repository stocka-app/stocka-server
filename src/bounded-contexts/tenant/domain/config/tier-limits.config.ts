export interface TierLimits {
  maxWarehouses: number;
  maxUsers: number;
  maxProducts: number;
  invitationsEnabled: boolean;
  advancedReportsEnabled: boolean;
}

export const TIER_LIMITS_CONFIG: Record<string, TierLimits> = {
  FREE: {
    maxWarehouses: 0,
    maxUsers: 1,
    maxProducts: 100,
    invitationsEnabled: false,
    advancedReportsEnabled: false,
  },
  STARTER: {
    maxWarehouses: 3,
    maxUsers: 5,
    maxProducts: 1000,
    invitationsEnabled: true,
    advancedReportsEnabled: false,
  },
  GROWTH: {
    maxWarehouses: 10,
    maxUsers: 25,
    maxProducts: 5000,
    invitationsEnabled: true,
    advancedReportsEnabled: true,
  },
  ENTERPRISE: {
    maxWarehouses: -1,
    maxUsers: -1,
    maxProducts: -1,
    invitationsEnabled: true,
    advancedReportsEnabled: true,
  },
};

export function getTierLimits(tier: string): TierLimits {
  return TIER_LIMITS_CONFIG[tier] ?? TIER_LIMITS_CONFIG['FREE'];
}

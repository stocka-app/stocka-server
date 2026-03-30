export interface IRbacPolicyPort {
  /** Get the set of action keys allowed for a given role */
  getRoleActions(roleKey: string): Promise<ReadonlySet<string>>;

  /** Get the minimum tier required for each action: Record<actionKey, tierKey> */
  getActionTierRequirements(): Promise<Readonly<Record<string, string>>>;

  /** Get numeric limits for a tier: Record<limitKey, number> (-1 = unlimited) */
  getTierNumericLimits(tier: string): Promise<Readonly<Record<string, number>>>;

  /** Get tier ordering: Record<tierKey, orderNumber> */
  getTierOrder(): Promise<Readonly<Record<string, number>>>;

  /** Get which actions trigger a limit check: Record<actionKey, limitKey> */
  getActionLimitChecks(): Promise<Readonly<Record<string, string>>>;

  /** Get roles assignable by a given role */
  getAssignableRoles(roleKey: string): Promise<readonly string[]>;

  /** Get active individual grants for a user in a tenant */
  getUserGrants(tenantId: number, userId: number): Promise<readonly string[]>;
}

import { CapabilityResolver } from '@shared/domain/policy/capability.resolver';
import { SystemAction } from '@shared/domain/policy/actions-catalog';
import { TierEnum } from '@shared/domain/policy/tier.enum';
import { MemberRoleEnum } from '@shared/domain/policy/member-role.enum';
import { PolicyContext } from '@shared/domain/policy/policy-context';
import { CapabilitySnapshot, createEmptySnapshot } from '@shared/domain/policy/capability-snapshot';
import { IRbacPolicyPort } from '@shared/domain/policy/rbac-policy.port';

// ── Mock RBAC policy data (mirrors the old static constants) ──────────────────

const ALL_ACTIONS = new Set(Object.values(SystemAction));

const ROLE_ACTIONS: Record<string, ReadonlySet<string>> = {
  [MemberRoleEnum.OWNER]: ALL_ACTIONS,
  [MemberRoleEnum.PARTNER]: new Set(
    [...ALL_ACTIONS].filter((a) => a !== SystemAction.TENANT_SETTINGS_UPDATE),
  ),
  [MemberRoleEnum.MANAGER]: new Set([
    SystemAction.STORAGE_CREATE,
    SystemAction.STORAGE_READ,
    SystemAction.STORAGE_UPDATE,
    SystemAction.STORAGE_DELETE,
    SystemAction.MEMBER_INVITE,
    SystemAction.MEMBER_READ,
    SystemAction.PRODUCT_CREATE,
    SystemAction.PRODUCT_READ,
    SystemAction.PRODUCT_UPDATE,
    SystemAction.PRODUCT_DELETE,
    SystemAction.REPORT_READ,
    SystemAction.REPORT_ADVANCED,
    SystemAction.INVENTORY_EXPORT,
    SystemAction.TENANT_SETTINGS_READ,
  ]),
  [MemberRoleEnum.BUYER]: new Set([
    SystemAction.PRODUCT_CREATE,
    SystemAction.PRODUCT_READ,
    SystemAction.PRODUCT_UPDATE,
    SystemAction.REPORT_READ,
    SystemAction.TENANT_SETTINGS_READ,
  ]),
  [MemberRoleEnum.WAREHOUSE_KEEPER]: new Set([
    SystemAction.STORAGE_READ,
    SystemAction.STORAGE_UPDATE,
    SystemAction.PRODUCT_READ,
    SystemAction.PRODUCT_UPDATE,
    SystemAction.INVENTORY_EXPORT,
    SystemAction.REPORT_READ,
    SystemAction.TENANT_SETTINGS_READ,
  ]),
  [MemberRoleEnum.SALES_REP]: new Set([
    SystemAction.PRODUCT_READ,
    SystemAction.REPORT_READ,
    SystemAction.TENANT_SETTINGS_READ,
  ]),
  [MemberRoleEnum.VIEWER]: new Set([
    SystemAction.STORAGE_READ,
    SystemAction.MEMBER_READ,
    SystemAction.PRODUCT_READ,
    SystemAction.REPORT_READ,
    SystemAction.TENANT_SETTINGS_READ,
  ]),
};

const ACTION_TIER_REQUIREMENTS: Readonly<Record<string, string>> = {
  [SystemAction.STORAGE_CREATE]: TierEnum.STARTER,
  [SystemAction.STORAGE_READ]: TierEnum.FREE,
  [SystemAction.STORAGE_UPDATE]: TierEnum.STARTER,
  [SystemAction.STORAGE_DELETE]: TierEnum.STARTER,
  [SystemAction.MEMBER_INVITE]: TierEnum.STARTER,
  [SystemAction.MEMBER_READ]: TierEnum.FREE,
  [SystemAction.MEMBER_UPDATE_ROLE]: TierEnum.STARTER,
  [SystemAction.MEMBER_REMOVE]: TierEnum.STARTER,
  [SystemAction.PRODUCT_CREATE]: TierEnum.FREE,
  [SystemAction.PRODUCT_READ]: TierEnum.FREE,
  [SystemAction.PRODUCT_UPDATE]: TierEnum.FREE,
  [SystemAction.PRODUCT_DELETE]: TierEnum.FREE,
  [SystemAction.REPORT_READ]: TierEnum.FREE,
  [SystemAction.REPORT_ADVANCED]: TierEnum.GROWTH,
  [SystemAction.INVENTORY_EXPORT]: TierEnum.STARTER,
  [SystemAction.TENANT_SETTINGS_READ]: TierEnum.FREE,
  [SystemAction.TENANT_SETTINGS_UPDATE]: TierEnum.FREE,
};

const TIER_ORDER: Readonly<Record<string, number>> = {
  [TierEnum.FREE]: 0,
  [TierEnum.STARTER]: 1,
  [TierEnum.GROWTH]: 2,
  [TierEnum.ENTERPRISE]: 3,
};

const TIER_NUMERIC_LIMITS: Record<string, Readonly<Record<string, number>>> = {
  [TierEnum.FREE]: { storageCount: 0, memberCount: 1, productCount: 100 },
  [TierEnum.STARTER]: { storageCount: 3, memberCount: 5, productCount: 1000 },
  [TierEnum.GROWTH]: { storageCount: 10, memberCount: 25, productCount: 5000 },
  [TierEnum.ENTERPRISE]: { storageCount: -1, memberCount: -1, productCount: -1 },
};

const ACTION_LIMIT_CHECKS: Readonly<Record<string, string>> = {
  [SystemAction.STORAGE_CREATE]: 'storageCount',
  [SystemAction.MEMBER_INVITE]: 'memberCount',
  [SystemAction.PRODUCT_CREATE]: 'productCount',
};

// ── Mock port factory ─────────────────────────────────────────────────────────

function createMockRbacPolicyPort(): IRbacPolicyPort {
  return {
    getRoleActions: jest.fn((roleKey: string) =>
      Promise.resolve(ROLE_ACTIONS[roleKey] ?? new Set<string>()),
    ),
    getActionTierRequirements: jest.fn(() =>
      Promise.resolve(ACTION_TIER_REQUIREMENTS),
    ),
    getTierNumericLimits: jest.fn((tier: string) =>
      Promise.resolve(TIER_NUMERIC_LIMITS[tier] ?? {}),
    ),
    getTierOrder: jest.fn(() => Promise.resolve(TIER_ORDER)),
    getActionLimitChecks: jest.fn(() => Promise.resolve(ACTION_LIMIT_CHECKS)),
    getAssignableRoles: jest.fn(() => Promise.resolve([])),
    getUserGrants: jest.fn(() => Promise.resolve([])),
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CapabilityResolver', () => {
  let resolver: CapabilityResolver;
  let mockPort: IRbacPolicyPort;

  beforeEach(() => {
    mockPort = createMockRbacPolicyPort();
    resolver = new CapabilityResolver(mockPort);
  });

  // ── Tier gate (FeatureNotInTierError) ────────────────────────────────────

  describe('Given a FREE tier tenant', () => {
    describe('When an OWNER tries to create a storage', () => {
      it('Then the action is denied because FREE tier has no storage access', async () => {
        const context: PolicyContext = {
          tenantTier: TierEnum.FREE,
          userRole: MemberRoleEnum.OWNER,
          action: SystemAction.STORAGE_CREATE,
        };
        const result = await resolver.canPerformAction(context);
        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr().errorCode).toBe('FEATURE_NOT_IN_TIER');
      });
    });

    describe('When an OWNER tries to invite a member', () => {
      it('Then the action is denied because invitations require STARTER+', async () => {
        const context: PolicyContext = {
          tenantTier: TierEnum.FREE,
          userRole: MemberRoleEnum.OWNER,
          action: SystemAction.MEMBER_INVITE,
        };
        const result = await resolver.canPerformAction(context);
        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr().errorCode).toBe('FEATURE_NOT_IN_TIER');
      });
    });

    describe('When an OWNER exports inventory', () => {
      it('Then the action is denied because export requires STARTER+', async () => {
        const context: PolicyContext = {
          tenantTier: TierEnum.FREE,
          userRole: MemberRoleEnum.OWNER,
          action: SystemAction.INVENTORY_EXPORT,
        };
        const result = await resolver.canPerformAction(context);
        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr().errorCode).toBe('FEATURE_NOT_IN_TIER');
      });
    });
  });

  describe('Given a STARTER tier tenant', () => {
    describe('When an OWNER requests advanced reports', () => {
      it('Then the action is denied because advanced reports require GROWTH+', async () => {
        const context: PolicyContext = {
          tenantTier: TierEnum.STARTER,
          userRole: MemberRoleEnum.OWNER,
          action: SystemAction.REPORT_ADVANCED,
        };
        const result = await resolver.canPerformAction(context);
        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr().errorCode).toBe('FEATURE_NOT_IN_TIER');
      });
    });
  });

  // ── Role gate (ActionNotAllowedError) ────────────────────────────────────

  describe('Given a STARTER tier tenant with a VIEWER role', () => {
    describe('When the VIEWER tries to create a product', () => {
      it('Then the action is denied because VIEWER cannot write', async () => {
        const context: PolicyContext = {
          tenantTier: TierEnum.STARTER,
          userRole: MemberRoleEnum.VIEWER,
          action: SystemAction.PRODUCT_CREATE,
        };
        const result = await resolver.canPerformAction(context);
        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr().errorCode).toBe('ACTION_NOT_ALLOWED');
      });
    });

    describe('When the VIEWER tries to update tenant settings', () => {
      it('Then the action is denied because VIEWER has no write access', async () => {
        const context: PolicyContext = {
          tenantTier: TierEnum.STARTER,
          userRole: MemberRoleEnum.VIEWER,
          action: SystemAction.TENANT_SETTINGS_UPDATE,
        };
        const result = await resolver.canPerformAction(context);
        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr().errorCode).toBe('ACTION_NOT_ALLOWED');
      });
    });
  });

  describe('Given a GROWTH tier tenant with a SALES_REP role', () => {
    describe('When the SALES_REP tries to delete a product', () => {
      it('Then the action is denied because SALES_REP cannot delete', async () => {
        const context: PolicyContext = {
          tenantTier: TierEnum.GROWTH,
          userRole: MemberRoleEnum.SALES_REP,
          action: SystemAction.PRODUCT_DELETE,
        };
        const result = await resolver.canPerformAction(context);
        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr().errorCode).toBe('ACTION_NOT_ALLOWED');
      });
    });

    describe('When the SALES_REP tries to create a storage', () => {
      it('Then the action is denied because SALES_REP cannot manage storages', async () => {
        const context: PolicyContext = {
          tenantTier: TierEnum.GROWTH,
          userRole: MemberRoleEnum.SALES_REP,
          action: SystemAction.STORAGE_CREATE,
        };
        const result = await resolver.canPerformAction(context);
        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr().errorCode).toBe('ACTION_NOT_ALLOWED');
      });
    });
  });

  describe('Given a STARTER tier tenant with a WAREHOUSE_KEEPER role', () => {
    describe('When the WAREHOUSE_KEEPER tries to invite a member', () => {
      it('Then the action is denied because WAREHOUSE_KEEPER cannot manage members', async () => {
        const context: PolicyContext = {
          tenantTier: TierEnum.STARTER,
          userRole: MemberRoleEnum.WAREHOUSE_KEEPER,
          action: SystemAction.MEMBER_INVITE,
        };
        const result = await resolver.canPerformAction(context);
        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr().errorCode).toBe('ACTION_NOT_ALLOWED');
      });
    });
  });

  // ── Usage limit gate (TierLimitReachedError) ─────────────────────────────

  describe('Given a FREE tier tenant that has reached the product limit', () => {
    describe('When an OWNER tries to create one more product', () => {
      it('Then the action is denied with TierLimitReachedError', async () => {
        const context: PolicyContext = {
          tenantTier: TierEnum.FREE,
          userRole: MemberRoleEnum.OWNER,
          action: SystemAction.PRODUCT_CREATE,
          usageCounts: { productCount: 100, storageCount: 0, memberCount: 1 },
        };
        const result = await resolver.canPerformAction(context);
        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr().errorCode).toBe('TIER_LIMIT_REACHED');
      });
    });
  });

  describe('Given a STARTER tier tenant that has reached the storage limit', () => {
    describe('When an OWNER tries to create one more storage', () => {
      it('Then the action is denied with TierLimitReachedError', async () => {
        const context: PolicyContext = {
          tenantTier: TierEnum.STARTER,
          userRole: MemberRoleEnum.OWNER,
          action: SystemAction.STORAGE_CREATE,
          usageCounts: { storageCount: 3, memberCount: 2, productCount: 100 },
        };
        const result = await resolver.canPerformAction(context);
        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr().errorCode).toBe('TIER_LIMIT_REACHED');
      });
    });
  });

  describe('Given a STARTER tier tenant that has reached the member limit', () => {
    describe('When an OWNER tries to invite one more member', () => {
      it('Then the action is denied with TierLimitReachedError', async () => {
        const context: PolicyContext = {
          tenantTier: TierEnum.STARTER,
          userRole: MemberRoleEnum.OWNER,
          action: SystemAction.MEMBER_INVITE,
          usageCounts: { storageCount: 1, memberCount: 5, productCount: 0 },
        };
        const result = await resolver.canPerformAction(context);
        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr().errorCode).toBe('TIER_LIMIT_REACHED');
      });
    });
  });

  // ── Grant (allowed) ─────────────────────────────────────────────────────

  describe('Given a STARTER tier tenant with an OWNER role', () => {
    describe('When creating a storage within the tier limit', () => {
      it('Then the action is allowed', async () => {
        const context: PolicyContext = {
          tenantTier: TierEnum.STARTER,
          userRole: MemberRoleEnum.OWNER,
          action: SystemAction.STORAGE_CREATE,
          usageCounts: { storageCount: 1, memberCount: 2, productCount: 50 },
        };
        const result = await resolver.canPerformAction(context);
        expect(result.isOk()).toBe(true);
      });
    });

    describe('When inviting a member within the tier limit', () => {
      it('Then the action is allowed', async () => {
        const context: PolicyContext = {
          tenantTier: TierEnum.STARTER,
          userRole: MemberRoleEnum.OWNER,
          action: SystemAction.MEMBER_INVITE,
          usageCounts: { storageCount: 0, memberCount: 3, productCount: 0 },
        };
        const result = await resolver.canPerformAction(context);
        expect(result.isOk()).toBe(true);
      });
    });
  });

  describe('Given a FREE tier tenant with an OWNER role', () => {
    describe('When reading products without usage counts', () => {
      it('Then the action is allowed without a usage check', async () => {
        const context: PolicyContext = {
          tenantTier: TierEnum.FREE,
          userRole: MemberRoleEnum.OWNER,
          action: SystemAction.PRODUCT_READ,
        };
        const result = await resolver.canPerformAction(context);
        expect(result.isOk()).toBe(true);
      });
    });

    describe('When creating products below the limit', () => {
      it('Then the action is allowed', async () => {
        const context: PolicyContext = {
          tenantTier: TierEnum.FREE,
          userRole: MemberRoleEnum.OWNER,
          action: SystemAction.PRODUCT_CREATE,
          usageCounts: { productCount: 50, storageCount: 0, memberCount: 1 },
        };
        const result = await resolver.canPerformAction(context);
        expect(result.isOk()).toBe(true);
      });
    });
  });

  describe('Given an ENTERPRISE tier tenant with a MANAGER role', () => {
    describe('When creating products far above what normal limits would be', () => {
      it('Then the action is allowed because ENTERPRISE has unlimited resources', async () => {
        const context: PolicyContext = {
          tenantTier: TierEnum.ENTERPRISE,
          userRole: MemberRoleEnum.MANAGER,
          action: SystemAction.PRODUCT_CREATE,
          usageCounts: { productCount: 99999, storageCount: 500, memberCount: 100 },
        };
        const result = await resolver.canPerformAction(context);
        expect(result.isOk()).toBe(true);
      });
    });

    describe('When creating storages far above normal limits', () => {
      it('Then the action is allowed because ENTERPRISE storage is unlimited', async () => {
        const context: PolicyContext = {
          tenantTier: TierEnum.ENTERPRISE,
          userRole: MemberRoleEnum.MANAGER,
          action: SystemAction.STORAGE_CREATE,
          usageCounts: { storageCount: 999, memberCount: 50, productCount: 1000 },
        };
        const result = await resolver.canPerformAction(context);
        expect(result.isOk()).toBe(true);
      });
    });
  });

  describe('Given a GROWTH tier tenant with a BUYER role', () => {
    describe('When creating a product within the limit', () => {
      it('Then the action is allowed', async () => {
        const context: PolicyContext = {
          tenantTier: TierEnum.GROWTH,
          userRole: MemberRoleEnum.BUYER,
          action: SystemAction.PRODUCT_CREATE,
          usageCounts: { productCount: 100, storageCount: 2, memberCount: 5 },
        };
        const result = await resolver.canPerformAction(context);
        expect(result.isOk()).toBe(true);
      });
    });
  });

  describe('Given a GROWTH tier tenant with a WAREHOUSE_KEEPER role', () => {
    describe('When exporting inventory', () => {
      it('Then the action is allowed', async () => {
        const context: PolicyContext = {
          tenantTier: TierEnum.GROWTH,
          userRole: MemberRoleEnum.WAREHOUSE_KEEPER,
          action: SystemAction.INVENTORY_EXPORT,
        };
        const result = await resolver.canPerformAction(context);
        expect(result.isOk()).toBe(true);
      });
    });
  });

  describe('Given a VIEWER role regardless of tier', () => {
    describe('When reading tenant settings', () => {
      it('Then the action is allowed because VIEWER has read access to settings', async () => {
        const context: PolicyContext = {
          tenantTier: TierEnum.FREE,
          userRole: MemberRoleEnum.VIEWER,
          action: SystemAction.TENANT_SETTINGS_READ,
        };
        const result = await resolver.canPerformAction(context);
        expect(result.isOk()).toBe(true);
      });
    });
  });

  // ── Partial usageCounts (counter key absent) ────────────────────────────

  describe('Given a STARTER tier tenant with partial usageCounts', () => {
    describe('When creating a storage but the storageCount key is absent in usageCounts', () => {
      it('Then the limit check is skipped and the action is allowed', async () => {
        const context: PolicyContext = {
          tenantTier: TierEnum.STARTER,
          userRole: MemberRoleEnum.OWNER,
          action: SystemAction.STORAGE_CREATE,
          usageCounts: { memberCount: 2, productCount: 10 } as never,
        };
        const result = await resolver.canPerformAction(context);
        expect(result.isOk()).toBe(true);
      });
    });
  });

  describe('Given an action that has no limit check', () => {
    describe('When a MANAGER reads products with usageCounts provided', () => {
      it('Then the action is allowed and no limit check is performed', async () => {
        const context: PolicyContext = {
          tenantTier: TierEnum.FREE,
          userRole: MemberRoleEnum.MANAGER,
          action: SystemAction.PRODUCT_READ,
          usageCounts: { productCount: 100, storageCount: 0, memberCount: 1 },
        };
        const result = await resolver.canPerformAction(context);
        expect(result.isOk()).toBe(true);
      });
    });
  });

  // ── Tier check precedes role check ──────────────────────────────────────

  describe('Given a FREE tenant with a BUYER trying to create a storage', () => {
    describe('When the tier blocks the feature before the role is evaluated', () => {
      it('Then the error is FeatureNotInTierError, not ActionNotAllowedError', async () => {
        const context: PolicyContext = {
          tenantTier: TierEnum.FREE,
          userRole: MemberRoleEnum.BUYER,
          action: SystemAction.STORAGE_CREATE,
        };
        const result = await resolver.canPerformAction(context);
        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr().errorCode).toBe('FEATURE_NOT_IN_TIER');
      });
    });
  });

  // ── canPerformActionWithSnapshot ────────────────────────────────────────

  describe('Given a snapshot where PRODUCT_CREATE is enabled', () => {
    let snapshot: CapabilitySnapshot;

    beforeEach(() => {
      snapshot = createEmptySnapshot();
      snapshot[SystemAction.PRODUCT_CREATE] = { enabled: true, reason: 'Allowed' };
      snapshot[SystemAction.PRODUCT_READ] = { enabled: true, reason: 'Allowed' };
    });

    describe('When an OWNER performs the action within limits', () => {
      it('Then the action is allowed', async () => {
        const context: PolicyContext = {
          tenantTier: TierEnum.FREE,
          userRole: MemberRoleEnum.OWNER,
          action: SystemAction.PRODUCT_CREATE,
          usageCounts: { productCount: 50, storageCount: 0, memberCount: 1 },
        };
        const result = await resolver.canPerformActionWithSnapshot(context, snapshot);
        expect(result.isOk()).toBe(true);
      });
    });

    describe('When a VIEWER tries the action', () => {
      it('Then the action is denied by the role check', async () => {
        const context: PolicyContext = {
          tenantTier: TierEnum.FREE,
          userRole: MemberRoleEnum.VIEWER,
          action: SystemAction.PRODUCT_CREATE,
        };
        const result = await resolver.canPerformActionWithSnapshot(context, snapshot);
        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr().errorCode).toBe('ACTION_NOT_ALLOWED');
      });
    });

    describe('When an OWNER exceeds the usage limit', () => {
      it('Then the action is denied with TierLimitReachedError', async () => {
        const context: PolicyContext = {
          tenantTier: TierEnum.FREE,
          userRole: MemberRoleEnum.OWNER,
          action: SystemAction.PRODUCT_CREATE,
          usageCounts: { productCount: 100, storageCount: 0, memberCount: 1 },
        };
        const result = await resolver.canPerformActionWithSnapshot(context, snapshot);
        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr().errorCode).toBe('TIER_LIMIT_REACHED');
      });
    });
  });

  describe('Given a snapshot where STORAGE_CREATE is disabled', () => {
    let snapshot: CapabilitySnapshot;

    beforeEach(() => {
      snapshot = createEmptySnapshot();
      snapshot[SystemAction.STORAGE_CREATE] = { enabled: false, reason: 'Module disabled' };
    });

    describe('When an OWNER on a STARTER tier tries the action', () => {
      it('Then the action is denied by the snapshot', async () => {
        const context: PolicyContext = {
          tenantTier: TierEnum.STARTER,
          userRole: MemberRoleEnum.OWNER,
          action: SystemAction.STORAGE_CREATE,
        };
        const result = await resolver.canPerformActionWithSnapshot(context, snapshot);
        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr().errorCode).toBe('FEATURE_NOT_IN_TIER');
      });
    });
  });

  describe('Given a snapshot-based check with no usageCounts', () => {
    let snapshot: CapabilitySnapshot;

    beforeEach(() => {
      snapshot = createEmptySnapshot();
      snapshot[SystemAction.PRODUCT_READ] = { enabled: true, reason: 'Allowed' };
    });

    describe('When an OWNER reads products', () => {
      it('Then the action is allowed without usage check', async () => {
        const context: PolicyContext = {
          tenantTier: TierEnum.FREE,
          userRole: MemberRoleEnum.OWNER,
          action: SystemAction.PRODUCT_READ,
        };
        const result = await resolver.canPerformActionWithSnapshot(context, snapshot);
        expect(result.isOk()).toBe(true);
      });
    });
  });
});

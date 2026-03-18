import { CapabilityResolver } from '@shared/domain/policy/capability.resolver';
import { SystemAction } from '@shared/domain/policy/actions-catalog';
import { TierEnum } from '@shared/domain/policy/tier.enum';
import { MemberRoleEnum } from '@shared/domain/policy/member-role.enum';
import { PolicyContext } from '@shared/domain/policy/policy-context';

describe('CapabilityResolver', () => {
  let resolver: CapabilityResolver;

  beforeEach(() => {
    resolver = new CapabilityResolver();
  });

  // ── Tier gate (FeatureNotInTierError) ──────────────────────────────────────

  describe('Given a FREE tier tenant', () => {
    describe('When an OWNER tries to create a storage', () => {
      it('Then the action is denied because FREE tier has no storage access', () => {
        const context: PolicyContext = {
          tenantTier: TierEnum.FREE,
          userRole: MemberRoleEnum.OWNER,
          action: SystemAction.STORAGE_CREATE,
        };
        const result = resolver.canPerformAction(context);
        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr().errorCode).toBe('FEATURE_NOT_IN_TIER');
      });
    });

    describe('When an OWNER tries to invite a member', () => {
      it('Then the action is denied because invitations require STARTER+', () => {
        const context: PolicyContext = {
          tenantTier: TierEnum.FREE,
          userRole: MemberRoleEnum.OWNER,
          action: SystemAction.MEMBER_INVITE,
        };
        const result = resolver.canPerformAction(context);
        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr().errorCode).toBe('FEATURE_NOT_IN_TIER');
      });
    });

    describe('When an OWNER exports inventory', () => {
      it('Then the action is denied because export requires STARTER+', () => {
        const context: PolicyContext = {
          tenantTier: TierEnum.FREE,
          userRole: MemberRoleEnum.OWNER,
          action: SystemAction.INVENTORY_EXPORT,
        };
        const result = resolver.canPerformAction(context);
        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr().errorCode).toBe('FEATURE_NOT_IN_TIER');
      });
    });
  });

  describe('Given a STARTER tier tenant', () => {
    describe('When an OWNER requests advanced reports', () => {
      it('Then the action is denied because advanced reports require GROWTH+', () => {
        const context: PolicyContext = {
          tenantTier: TierEnum.STARTER,
          userRole: MemberRoleEnum.OWNER,
          action: SystemAction.REPORT_ADVANCED,
        };
        const result = resolver.canPerformAction(context);
        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr().errorCode).toBe('FEATURE_NOT_IN_TIER');
      });
    });
  });

  // ── Role gate (ActionNotAllowedError) ──────────────────────────────────────

  describe('Given a STARTER tier tenant with a VIEWER role', () => {
    describe('When the VIEWER tries to create a product', () => {
      it('Then the action is denied because VIEWER cannot write', () => {
        const context: PolicyContext = {
          tenantTier: TierEnum.STARTER,
          userRole: MemberRoleEnum.VIEWER,
          action: SystemAction.PRODUCT_CREATE,
        };
        const result = resolver.canPerformAction(context);
        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr().errorCode).toBe('ACTION_NOT_ALLOWED');
      });
    });

    describe('When the VIEWER tries to update tenant settings', () => {
      it('Then the action is denied because VIEWER has no write access', () => {
        const context: PolicyContext = {
          tenantTier: TierEnum.STARTER,
          userRole: MemberRoleEnum.VIEWER,
          action: SystemAction.TENANT_SETTINGS_UPDATE,
        };
        const result = resolver.canPerformAction(context);
        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr().errorCode).toBe('ACTION_NOT_ALLOWED');
      });
    });
  });

  describe('Given a GROWTH tier tenant with a SALES_REP role', () => {
    describe('When the SALES_REP tries to delete a product', () => {
      it('Then the action is denied because SALES_REP cannot delete', () => {
        const context: PolicyContext = {
          tenantTier: TierEnum.GROWTH,
          userRole: MemberRoleEnum.SALES_REP,
          action: SystemAction.PRODUCT_DELETE,
        };
        const result = resolver.canPerformAction(context);
        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr().errorCode).toBe('ACTION_NOT_ALLOWED');
      });
    });

    describe('When the SALES_REP tries to create a storage', () => {
      it('Then the action is denied because SALES_REP cannot manage storages', () => {
        const context: PolicyContext = {
          tenantTier: TierEnum.GROWTH,
          userRole: MemberRoleEnum.SALES_REP,
          action: SystemAction.STORAGE_CREATE,
        };
        const result = resolver.canPerformAction(context);
        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr().errorCode).toBe('ACTION_NOT_ALLOWED');
      });
    });
  });

  describe('Given a STARTER tier tenant with a WAREHOUSE_KEEPER role', () => {
    describe('When the WAREHOUSE_KEEPER tries to invite a member', () => {
      it('Then the action is denied because WAREHOUSE_KEEPER cannot manage members', () => {
        const context: PolicyContext = {
          tenantTier: TierEnum.STARTER,
          userRole: MemberRoleEnum.WAREHOUSE_KEEPER,
          action: SystemAction.MEMBER_INVITE,
        };
        const result = resolver.canPerformAction(context);
        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr().errorCode).toBe('ACTION_NOT_ALLOWED');
      });
    });
  });

  // ── Usage limit gate (TierLimitReachedError) ───────────────────────────────

  describe('Given a FREE tier tenant that has reached the product limit', () => {
    describe('When an OWNER tries to create one more product', () => {
      it('Then the action is denied with TierLimitReachedError', () => {
        const context: PolicyContext = {
          tenantTier: TierEnum.FREE,
          userRole: MemberRoleEnum.OWNER,
          action: SystemAction.PRODUCT_CREATE,
          usageCounts: { productCount: 100, storageCount: 0, memberCount: 1 },
        };
        const result = resolver.canPerformAction(context);
        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr().errorCode).toBe('TIER_LIMIT_REACHED');
      });
    });
  });

  describe('Given a STARTER tier tenant that has reached the storage limit', () => {
    describe('When an OWNER tries to create one more storage', () => {
      it('Then the action is denied with TierLimitReachedError', () => {
        const context: PolicyContext = {
          tenantTier: TierEnum.STARTER,
          userRole: MemberRoleEnum.OWNER,
          action: SystemAction.STORAGE_CREATE,
          usageCounts: { storageCount: 3, memberCount: 2, productCount: 100 },
        };
        const result = resolver.canPerformAction(context);
        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr().errorCode).toBe('TIER_LIMIT_REACHED');
      });
    });
  });

  describe('Given a STARTER tier tenant that has reached the member limit', () => {
    describe('When an OWNER tries to invite one more member', () => {
      it('Then the action is denied with TierLimitReachedError', () => {
        const context: PolicyContext = {
          tenantTier: TierEnum.STARTER,
          userRole: MemberRoleEnum.OWNER,
          action: SystemAction.MEMBER_INVITE,
          usageCounts: { storageCount: 1, memberCount: 5, productCount: 0 },
        };
        const result = resolver.canPerformAction(context);
        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr().errorCode).toBe('TIER_LIMIT_REACHED');
      });
    });
  });

  // ── Grant (allowed) ────────────────────────────────────────────────────────

  describe('Given a STARTER tier tenant with an OWNER role', () => {
    describe('When creating a storage within the tier limit', () => {
      it('Then the action is allowed', () => {
        const context: PolicyContext = {
          tenantTier: TierEnum.STARTER,
          userRole: MemberRoleEnum.OWNER,
          action: SystemAction.STORAGE_CREATE,
          usageCounts: { storageCount: 1, memberCount: 2, productCount: 50 },
        };
        const result = resolver.canPerformAction(context);
        expect(result.isOk()).toBe(true);
      });
    });

    describe('When inviting a member within the tier limit', () => {
      it('Then the action is allowed', () => {
        const context: PolicyContext = {
          tenantTier: TierEnum.STARTER,
          userRole: MemberRoleEnum.OWNER,
          action: SystemAction.MEMBER_INVITE,
          usageCounts: { storageCount: 0, memberCount: 3, productCount: 0 },
        };
        const result = resolver.canPerformAction(context);
        expect(result.isOk()).toBe(true);
      });
    });
  });

  describe('Given a FREE tier tenant with an OWNER role', () => {
    describe('When reading products without usage counts', () => {
      it('Then the action is allowed without a usage check', () => {
        const context: PolicyContext = {
          tenantTier: TierEnum.FREE,
          userRole: MemberRoleEnum.OWNER,
          action: SystemAction.PRODUCT_READ,
        };
        const result = resolver.canPerformAction(context);
        expect(result.isOk()).toBe(true);
      });
    });

    describe('When creating products below the limit', () => {
      it('Then the action is allowed', () => {
        const context: PolicyContext = {
          tenantTier: TierEnum.FREE,
          userRole: MemberRoleEnum.OWNER,
          action: SystemAction.PRODUCT_CREATE,
          usageCounts: { productCount: 50, storageCount: 0, memberCount: 1 },
        };
        const result = resolver.canPerformAction(context);
        expect(result.isOk()).toBe(true);
      });
    });
  });

  describe('Given an ENTERPRISE tier tenant with a MANAGER role', () => {
    describe('When creating products far above what normal limits would be', () => {
      it('Then the action is allowed because ENTERPRISE has unlimited resources', () => {
        const context: PolicyContext = {
          tenantTier: TierEnum.ENTERPRISE,
          userRole: MemberRoleEnum.MANAGER,
          action: SystemAction.PRODUCT_CREATE,
          usageCounts: { productCount: 99999, storageCount: 500, memberCount: 100 },
        };
        const result = resolver.canPerformAction(context);
        expect(result.isOk()).toBe(true);
      });
    });

    describe('When creating storages far above normal limits', () => {
      it('Then the action is allowed because ENTERPRISE storage is unlimited', () => {
        const context: PolicyContext = {
          tenantTier: TierEnum.ENTERPRISE,
          userRole: MemberRoleEnum.MANAGER,
          action: SystemAction.STORAGE_CREATE,
          usageCounts: { storageCount: 999, memberCount: 50, productCount: 1000 },
        };
        const result = resolver.canPerformAction(context);
        expect(result.isOk()).toBe(true);
      });
    });
  });

  describe('Given a GROWTH tier tenant with a BUYER role', () => {
    describe('When creating a product within the limit', () => {
      it('Then the action is allowed', () => {
        const context: PolicyContext = {
          tenantTier: TierEnum.GROWTH,
          userRole: MemberRoleEnum.BUYER,
          action: SystemAction.PRODUCT_CREATE,
          usageCounts: { productCount: 100, storageCount: 2, memberCount: 5 },
        };
        const result = resolver.canPerformAction(context);
        expect(result.isOk()).toBe(true);
      });
    });
  });

  describe('Given a GROWTH tier tenant with a WAREHOUSE_KEEPER role', () => {
    describe('When exporting inventory', () => {
      it('Then the action is allowed', () => {
        const context: PolicyContext = {
          tenantTier: TierEnum.GROWTH,
          userRole: MemberRoleEnum.WAREHOUSE_KEEPER,
          action: SystemAction.INVENTORY_EXPORT,
        };
        const result = resolver.canPerformAction(context);
        expect(result.isOk()).toBe(true);
      });
    });
  });

  describe('Given a VIEWER role regardless of tier', () => {
    describe('When reading tenant settings', () => {
      it('Then the action is allowed because VIEWER has read access to settings', () => {
        const context: PolicyContext = {
          tenantTier: TierEnum.FREE,
          userRole: MemberRoleEnum.VIEWER,
          action: SystemAction.TENANT_SETTINGS_READ,
        };
        const result = resolver.canPerformAction(context);
        expect(result.isOk()).toBe(true);
      });
    });
  });

  // ── Partial usageCounts (counter key absent) ──────────────────────────────

  describe('Given a STARTER tier tenant with partial usageCounts', () => {
    describe('When creating a storage but the storageCount key is absent in usageCounts', () => {
      it('Then the limit check is skipped and the action is allowed', () => {
        const context: PolicyContext = {
          tenantTier: TierEnum.STARTER,
          userRole: MemberRoleEnum.OWNER,
          action: SystemAction.STORAGE_CREATE,
          usageCounts: { memberCount: 2, productCount: 10 } as never,
        };
        const result = resolver.canPerformAction(context);
        expect(result.isOk()).toBe(true);
      });
    });
  });

  describe('Given an action that has no limit check', () => {
    describe('When a MANAGER reads products with usageCounts provided', () => {
      it('Then the action is allowed and no limit check is performed', () => {
        const context: PolicyContext = {
          tenantTier: TierEnum.FREE,
          userRole: MemberRoleEnum.MANAGER,
          action: SystemAction.PRODUCT_READ,
          usageCounts: { productCount: 100, storageCount: 0, memberCount: 1 },
        };
        const result = resolver.canPerformAction(context);
        expect(result.isOk()).toBe(true);
      });
    });
  });

  // ── Tier check precedes role check ─────────────────────────────────────────

  describe('Given a FREE tenant with a BUYER trying to create a storage', () => {
    describe('When the tier blocks the feature before the role is evaluated', () => {
      it('Then the error is FeatureNotInTierError, not ActionNotAllowedError', () => {
        const context: PolicyContext = {
          tenantTier: TierEnum.FREE,
          userRole: MemberRoleEnum.BUYER,
          action: SystemAction.STORAGE_CREATE,
        };
        const result = resolver.canPerformAction(context);
        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr().errorCode).toBe('FEATURE_NOT_IN_TIER');
      });
    });
  });
});

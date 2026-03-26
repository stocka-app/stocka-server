import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionGuard } from '@common/guards/permission.guard';
import {
  ITenantFacade,
  TenantMembershipContext,
} from '@tenant/domain/contracts/tenant-facade.contract';
import { CapabilityResolver } from '@shared/domain/policy/capability.resolver';
import { SystemAction } from '@shared/domain/policy/actions-catalog';
import { IRbacPolicyPort } from '@shared/domain/policy/rbac-policy.port';
import { TierEnum } from '@shared/domain/policy/tier.enum';
import { MemberRoleEnum } from '@shared/domain/policy/member-role.enum';

// ── Mock RBAC policy data ─────────────────────────────────────────────────────

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

function createMockRbacPolicyPort(): IRbacPolicyPort {
  return {
    getRoleActions: jest.fn((roleKey: string) =>
      Promise.resolve(ROLE_ACTIONS[roleKey] ?? new Set<string>()),
    ),
    getActionTierRequirements: jest.fn(() => Promise.resolve(ACTION_TIER_REQUIREMENTS)),
    getTierNumericLimits: jest.fn((tier: string) =>
      Promise.resolve(TIER_NUMERIC_LIMITS[tier] ?? {}),
    ),
    getTierOrder: jest.fn(() => Promise.resolve(TIER_ORDER)),
    getActionLimitChecks: jest.fn(() => Promise.resolve(ACTION_LIMIT_CHECKS)),
    getAssignableRoles: jest.fn(() => Promise.resolve([])),
    getUserGrants: jest.fn(() => Promise.resolve([])),
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildContext(
  user?: Record<string, unknown>,
  membershipContext?: TenantMembershipContext,
): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user, membershipContext }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe('PermissionGuard', () => {
  let guard: PermissionGuard;
  let reflector: jest.Mocked<Reflector>;
  let tenantFacade: jest.Mocked<Pick<ITenantFacade, 'getMembershipContext'>>;
  let capabilityResolver: CapabilityResolver;

  const ACTIVE_CONTEXT: TenantMembershipContext = {
    tenantUUID: 'tenant-uuid-001',
    role: 'OWNER',
    tenantStatus: 'active',
    tier: 'ENTERPRISE',
    usageCounts: { storageCount: 1, memberCount: 2, productCount: 5 },
  };

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;

    tenantFacade = {
      getMembershipContext: jest.fn(),
    };

    const mockPort = createMockRbacPolicyPort();
    capabilityResolver = new CapabilityResolver(mockPort);

    guard = new PermissionGuard(
      reflector,
      tenantFacade as unknown as ITenantFacade,
      capabilityResolver,
    );
  });

  describe('Given a controller method without @RequireAction decorator', () => {
    beforeEach(() => {
      reflector.getAllAndOverride.mockReturnValue(undefined);
    });

    describe('When the guard evaluates the request', () => {
      it('Then it allows the request to pass through', async () => {
        const context = buildContext();
        const result = await guard.canActivate(context);
        expect(result).toBe(true);
      });
    });
  });

  describe('Given a controller method with @RequireAction but no authenticated user', () => {
    beforeEach(() => {
      reflector.getAllAndOverride.mockReturnValue(SystemAction.STORAGE_CREATE);
    });

    describe('When the request has no user in the JWT payload', () => {
      it('Then it rejects with 401 NOT_AUTHENTICATED', async () => {
        const context = buildContext(undefined);
        try {
          await guard.canActivate(context);
          fail('Expected HttpException');
        } catch (e) {
          expect(e).toBeInstanceOf(HttpException);
          const httpError = e as HttpException;
          expect(httpError.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
          const body = httpError.getResponse() as Record<string, unknown>;
          expect(body['error']).toBe('NOT_AUTHENTICATED');
        }
      });
    });
  });

  describe('Given a user who has no active membership in any tenant', () => {
    beforeEach(() => {
      reflector.getAllAndOverride.mockReturnValue(SystemAction.STORAGE_CREATE);
      tenantFacade.getMembershipContext.mockResolvedValue(null);
    });

    describe('When the guard checks the membership', () => {
      it('Then it rejects with 403 MEMBERSHIP_REQUIRED', async () => {
        const context = buildContext({
          uuid: 'user-uuid',
          email: 'u@t.com',
          tenantId: null,
          role: null,
        });
        try {
          await guard.canActivate(context);
          fail('Expected HttpException');
        } catch (e) {
          expect(e).toBeInstanceOf(HttpException);
          const httpError = e as HttpException;
          expect(httpError.getStatus()).toBe(HttpStatus.FORBIDDEN);
          const body = httpError.getResponse() as Record<string, unknown>;
          expect(body['error']).toBe('MEMBERSHIP_REQUIRED');
        }
      });
    });
  });

  describe('Given a user whose tenant is suspended', () => {
    beforeEach(() => {
      reflector.getAllAndOverride.mockReturnValue(SystemAction.STORAGE_CREATE);
      tenantFacade.getMembershipContext.mockResolvedValue({
        ...ACTIVE_CONTEXT,
        tenantStatus: 'suspended',
      });
    });

    describe('When the guard checks the tenant status', () => {
      it('Then it rejects with 403 TENANT_NOT_ACTIVE', async () => {
        const context = buildContext({
          uuid: 'user-uuid',
          email: 'u@t.com',
          tenantId: 'tid',
          role: 'OWNER',
        });
        try {
          await guard.canActivate(context);
          fail('Expected HttpException');
        } catch (e) {
          expect(e).toBeInstanceOf(HttpException);
          const httpError = e as HttpException;
          expect(httpError.getStatus()).toBe(HttpStatus.FORBIDDEN);
          const body = httpError.getResponse() as Record<string, unknown>;
          expect(body['error']).toBe('TENANT_NOT_ACTIVE');
        }
      });
    });
  });

  describe('Given a user whose tenant is cancelled', () => {
    beforeEach(() => {
      reflector.getAllAndOverride.mockReturnValue(SystemAction.STORAGE_CREATE);
      tenantFacade.getMembershipContext.mockResolvedValue({
        ...ACTIVE_CONTEXT,
        tenantStatus: 'cancelled',
      });
    });

    describe('When the guard checks the tenant status', () => {
      it('Then it rejects with 403 TENANT_NOT_ACTIVE', async () => {
        const context = buildContext({
          uuid: 'user-uuid',
          email: 'u@t.com',
          tenantId: 'tid',
          role: 'OWNER',
        });
        try {
          await guard.canActivate(context);
          fail('Expected HttpException');
        } catch (e) {
          const httpError = e as HttpException;
          expect(httpError.getStatus()).toBe(HttpStatus.FORBIDDEN);
          const body = httpError.getResponse() as Record<string, unknown>;
          expect(body['error']).toBe('TENANT_NOT_ACTIVE');
        }
      });
    });
  });

  describe('Given a user whose role does not permit the requested action', () => {
    beforeEach(() => {
      reflector.getAllAndOverride.mockReturnValue(SystemAction.TENANT_SETTINGS_UPDATE);
      tenantFacade.getMembershipContext.mockResolvedValue({
        ...ACTIVE_CONTEXT,
        role: 'VIEWER',
      });
    });

    describe('When the guard evaluates the RBAC policy', () => {
      it('Then it rejects with 403 ACTION_NOT_ALLOWED', async () => {
        const context = buildContext({
          uuid: 'user-uuid',
          email: 'u@t.com',
          tenantId: 'tid',
          role: 'VIEWER',
        });
        try {
          await guard.canActivate(context);
          fail('Expected HttpException');
        } catch (e) {
          const httpError = e as HttpException;
          expect(httpError.getStatus()).toBe(HttpStatus.FORBIDDEN);
          const body = httpError.getResponse() as Record<string, unknown>;
          expect(body['error']).toBe('ACTION_NOT_ALLOWED');
        }
      });
    });
  });

  describe('Given a user whose tier does not support the requested feature', () => {
    beforeEach(() => {
      reflector.getAllAndOverride.mockReturnValue(SystemAction.STORAGE_CREATE);
      tenantFacade.getMembershipContext.mockResolvedValue({
        ...ACTIVE_CONTEXT,
        tier: 'FREE',
      });
    });

    describe('When the guard evaluates the tier policy', () => {
      it('Then it rejects with 403 FEATURE_NOT_IN_TIER', async () => {
        const context = buildContext({
          uuid: 'user-uuid',
          email: 'u@t.com',
          tenantId: 'tid',
          role: 'OWNER',
        });
        try {
          await guard.canActivate(context);
          fail('Expected HttpException');
        } catch (e) {
          const httpError = e as HttpException;
          expect(httpError.getStatus()).toBe(HttpStatus.FORBIDDEN);
          const body = httpError.getResponse() as Record<string, unknown>;
          expect(body['error']).toBe('FEATURE_NOT_IN_TIER');
        }
      });
    });
  });

  describe('Given a user whose tenant has reached the usage limit for the action', () => {
    beforeEach(() => {
      reflector.getAllAndOverride.mockReturnValue(SystemAction.STORAGE_CREATE);
      tenantFacade.getMembershipContext.mockResolvedValue({
        ...ACTIVE_CONTEXT,
        tier: 'STARTER',
        usageCounts: { storageCount: 3, memberCount: 2, productCount: 5 },
      });
    });

    describe('When the guard evaluates the usage limit', () => {
      it('Then it rejects with 403 TIER_LIMIT_REACHED', async () => {
        const context = buildContext({
          uuid: 'user-uuid',
          email: 'u@t.com',
          tenantId: 'tid',
          role: 'OWNER',
        });
        try {
          await guard.canActivate(context);
          fail('Expected HttpException');
        } catch (e) {
          const httpError = e as HttpException;
          expect(httpError.getStatus()).toBe(HttpStatus.FORBIDDEN);
          const body = httpError.getResponse() as Record<string, unknown>;
          expect(body['error']).toBe('TIER_LIMIT_REACHED');
        }
      });
    });
  });

  describe('Given a user who passes all RBAC checks (OWNER on ENTERPRISE with usage below limits)', () => {
    beforeEach(() => {
      reflector.getAllAndOverride.mockReturnValue(SystemAction.STORAGE_CREATE);
      tenantFacade.getMembershipContext.mockResolvedValue(ACTIVE_CONTEXT);
    });

    describe('When the guard evaluates the request', () => {
      it('Then it allows the request through and returns true', async () => {
        const context = buildContext({
          uuid: 'user-uuid',
          email: 'u@t.com',
          tenantId: 'tid',
          role: 'OWNER',
        });
        const result = await guard.canActivate(context);
        expect(result).toBe(true);
      });
    });
  });

  describe('Given a MANAGER on STARTER tier performing an allowed action', () => {
    beforeEach(() => {
      reflector.getAllAndOverride.mockReturnValue(SystemAction.PRODUCT_READ);
      tenantFacade.getMembershipContext.mockResolvedValue({
        ...ACTIVE_CONTEXT,
        role: 'MANAGER',
        tier: 'STARTER',
      });
    });

    describe('When the guard evaluates the request', () => {
      it('Then it allows the request through', async () => {
        const context = buildContext({
          uuid: 'user-uuid',
          email: 'u@t.com',
          tenantId: 'tid',
          role: 'MANAGER',
        });
        const result = await guard.canActivate(context);
        expect(result).toBe(true);
      });
    });
  });

  describe('Given TenantGuard already ran and membershipContext is cached in the request', () => {
    beforeEach(() => {
      reflector.getAllAndOverride.mockReturnValue(SystemAction.STORAGE_CREATE);
    });

    describe('When PermissionGuard evaluates the request', () => {
      it('Then it uses the cached context and does not call the tenant facade', async () => {
        const context = buildContext(
          { uuid: 'user-uuid', email: 'u@t.com', tenantId: 'tid', role: 'OWNER' },
          ACTIVE_CONTEXT,
        );

        const result = await guard.canActivate(context);

        expect(result).toBe(true);
        expect(tenantFacade.getMembershipContext).not.toHaveBeenCalled();
      });
    });
  });
});

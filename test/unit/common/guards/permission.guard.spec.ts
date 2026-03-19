import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionGuard } from '@common/guards/permission.guard';
import {
  ITenantFacade,
  TenantMembershipContext,
} from '@tenant/domain/contracts/tenant-facade.contract';
import { CapabilityResolver } from '@shared/domain/policy/capability.resolver';
import { SystemAction } from '@shared/domain/policy/actions-catalog';

function buildContext(user?: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
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

    capabilityResolver = new CapabilityResolver();

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
      it('Then it rejects with 403 NOT_AUTHENTICATED', async () => {
        const context = buildContext(undefined);
        try {
          await guard.canActivate(context);
          fail('Expected HttpException');
        } catch (e) {
          expect(e).toBeInstanceOf(HttpException);
          const httpError = e as HttpException;
          expect(httpError.getStatus()).toBe(HttpStatus.FORBIDDEN);
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
});

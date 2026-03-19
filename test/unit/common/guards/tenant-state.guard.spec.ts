import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { TenantStateGuard } from '@common/guards/tenant-state.guard';
import { TenantMembershipContext } from '@tenant/domain/contracts/tenant-facade.contract';

const BASE_CONTEXT: TenantMembershipContext = {
  tenantUUID: 'tenant-uuid-001',
  role: 'OWNER',
  tenantStatus: 'active',
  tier: 'ENTERPRISE',
  usageCounts: { storageCount: 1, memberCount: 2, productCount: 5 },
};

function buildContext(
  membershipContext: TenantMembershipContext | undefined,
  method = 'GET',
): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ membershipContext, method }),
    }),
  } as unknown as ExecutionContext;
}

describe('TenantStateGuard', () => {
  let guard: TenantStateGuard;

  beforeEach(() => {
    guard = new TenantStateGuard();
  });

  describe('Given TenantGuard was not applied and no membership context is in the request', () => {
    describe('When TenantStateGuard evaluates the request', () => {
      it('Then it rejects with 403 TENANT_CONTEXT_MISSING', () => {
        const context = buildContext(undefined);
        try {
          guard.canActivate(context);
          fail('Expected HttpException');
        } catch (e) {
          expect(e).toBeInstanceOf(HttpException);
          const httpError = e as HttpException;
          expect(httpError.getStatus()).toBe(HttpStatus.FORBIDDEN);
          const body = httpError.getResponse() as Record<string, unknown>;
          expect(body['error']).toBe('TENANT_CONTEXT_MISSING');
        }
      });
    });
  });

  describe('Given a tenant with cancelled status', () => {
    describe('When TenantStateGuard evaluates any request', () => {
      it('Then it rejects with 401 TENANT_CANCELLED', () => {
        const context = buildContext({ ...BASE_CONTEXT, tenantStatus: 'cancelled' });
        try {
          guard.canActivate(context);
          fail('Expected HttpException');
        } catch (e) {
          expect(e).toBeInstanceOf(HttpException);
          const httpError = e as HttpException;
          expect(httpError.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
          const body = httpError.getResponse() as Record<string, unknown>;
          expect(body['error']).toBe('TENANT_CANCELLED');
        }
      });
    });
  });

  describe('Given a suspended tenant', () => {
    describe('When making a POST request (write operation)', () => {
      it('Then it rejects with 403 TENANT_SUSPENDED', () => {
        const context = buildContext({ ...BASE_CONTEXT, tenantStatus: 'suspended' }, 'POST');
        try {
          guard.canActivate(context);
          fail('Expected HttpException');
        } catch (e) {
          expect(e).toBeInstanceOf(HttpException);
          const httpError = e as HttpException;
          expect(httpError.getStatus()).toBe(HttpStatus.FORBIDDEN);
          const body = httpError.getResponse() as Record<string, unknown>;
          expect(body['error']).toBe('TENANT_SUSPENDED');
        }
      });
    });

    describe('When making a PATCH request (write operation)', () => {
      it('Then it rejects with 403 TENANT_SUSPENDED', () => {
        const context = buildContext({ ...BASE_CONTEXT, tenantStatus: 'suspended' }, 'PATCH');
        try {
          guard.canActivate(context);
          fail('Expected HttpException');
        } catch (e) {
          const httpError = e as HttpException;
          expect(httpError.getStatus()).toBe(HttpStatus.FORBIDDEN);
          const body = httpError.getResponse() as Record<string, unknown>;
          expect(body['error']).toBe('TENANT_SUSPENDED');
        }
      });
    });

    describe('When making a GET request (read operation)', () => {
      it('Then it allows the request through', () => {
        const context = buildContext({ ...BASE_CONTEXT, tenantStatus: 'suspended' }, 'GET');
        const result = guard.canActivate(context);
        expect(result).toBe(true);
      });
    });
  });

  describe('Given an active tenant', () => {
    describe('When making a write request', () => {
      it('Then it allows the request through', () => {
        const context = buildContext(BASE_CONTEXT, 'POST');
        const result = guard.canActivate(context);
        expect(result).toBe(true);
      });
    });

    describe('When making a read request', () => {
      it('Then it allows the request through', () => {
        const context = buildContext(BASE_CONTEXT, 'GET');
        const result = guard.canActivate(context);
        expect(result).toBe(true);
      });
    });
  });
});

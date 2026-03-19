import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { TenantGuard } from '@common/guards/tenant.guard';
import {
  ITenantFacade,
  TenantMembershipContext,
} from '@tenant/domain/contracts/tenant-facade.contract';

const ACTIVE_CONTEXT: TenantMembershipContext = {
  tenantUUID: 'tenant-uuid-001',
  role: 'OWNER',
  tenantStatus: 'active',
  tier: 'ENTERPRISE',
  usageCounts: { storageCount: 1, memberCount: 2, productCount: 5 },
};

function buildMutableRequest(user?: Record<string, unknown>): Record<string, unknown> {
  return { user };
}

function buildContext(requestObj: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => requestObj,
    }),
  } as unknown as ExecutionContext;
}

describe('TenantGuard', () => {
  let guard: TenantGuard;
  let tenantFacade: jest.Mocked<Pick<ITenantFacade, 'getMembershipContext'>>;

  beforeEach(() => {
    tenantFacade = {
      getMembershipContext: jest.fn(),
    };
    guard = new TenantGuard(tenantFacade as unknown as ITenantFacade);
  });

  describe('Given a request with no authenticated user', () => {
    describe('When TenantGuard evaluates the request', () => {
      it('Then it rejects with 401 TENANT_ID_MISSING', async () => {
        const context = buildContext(buildMutableRequest(undefined));
        try {
          await guard.canActivate(context);
          fail('Expected HttpException');
        } catch (e) {
          expect(e).toBeInstanceOf(HttpException);
          const httpError = e as HttpException;
          expect(httpError.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
          const body = httpError.getResponse() as Record<string, unknown>;
          expect(body['error']).toBe('TENANT_ID_MISSING');
        }
      });
    });
  });

  describe('Given a user with null tenantId in the JWT (onboarding not complete)', () => {
    describe('When TenantGuard evaluates the request', () => {
      it('Then it rejects with 401 TENANT_ID_MISSING', async () => {
        const context = buildContext(
          buildMutableRequest({ uuid: 'user-uuid', email: 'u@t.com', tenantId: null, role: null }),
        );
        try {
          await guard.canActivate(context);
          fail('Expected HttpException');
        } catch (e) {
          expect(e).toBeInstanceOf(HttpException);
          const httpError = e as HttpException;
          expect(httpError.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
          const body = httpError.getResponse() as Record<string, unknown>;
          expect(body['error']).toBe('TENANT_ID_MISSING');
        }
      });
    });
  });

  describe('Given a user with a tenantId but no active membership in the database', () => {
    beforeEach(() => {
      tenantFacade.getMembershipContext.mockResolvedValue(null);
    });

    describe('When TenantGuard evaluates the request', () => {
      it('Then it rejects with 403 MEMBERSHIP_NOT_FOUND', async () => {
        const context = buildContext(
          buildMutableRequest({
            uuid: 'user-uuid',
            email: 'u@t.com',
            tenantId: 'tenant-id',
            role: 'OWNER',
          }),
        );
        try {
          await guard.canActivate(context);
          fail('Expected HttpException');
        } catch (e) {
          expect(e).toBeInstanceOf(HttpException);
          const httpError = e as HttpException;
          expect(httpError.getStatus()).toBe(HttpStatus.FORBIDDEN);
          const body = httpError.getResponse() as Record<string, unknown>;
          expect(body['error']).toBe('MEMBERSHIP_NOT_FOUND');
        }
      });
    });
  });

  describe('Given a user with a valid tenantId and an active membership', () => {
    beforeEach(() => {
      tenantFacade.getMembershipContext.mockResolvedValue(ACTIVE_CONTEXT);
    });

    describe('When TenantGuard evaluates the request', () => {
      it('Then it allows the request through and attaches membershipContext to the request', async () => {
        const requestObj = buildMutableRequest({
          uuid: 'user-uuid',
          email: 'u@t.com',
          tenantId: 'tenant-id',
          role: 'OWNER',
        });
        const context = buildContext(requestObj);

        const result = await guard.canActivate(context);

        expect(result).toBe(true);
        expect(requestObj['membershipContext']).toEqual(ACTIVE_CONTEXT);
      });
    });
  });
});

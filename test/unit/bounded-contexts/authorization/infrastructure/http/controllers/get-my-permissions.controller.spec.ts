import { HttpException, HttpStatus } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { GetMyPermissionsController } from '@authorization/infrastructure/http/controllers/get-my-permissions/get-my-permissions.controller';
import {
  ITenantFacade,
  TenantMembershipContext,
} from '@tenant/domain/contracts/tenant-facade.contract';
import { IRbacPolicyPort } from '@authorization/domain/contracts/rbac-policy.port';
import { JwtPayload } from '@common/decorators/current-user.decorator';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildUser(): JwtPayload {
  return {
    uuid: 'user-uuid-123',
    email: 'test@example.com',
    tenantId: 'tenant-uuid-456',
    role: 'OWNER',
    tierLimits: null,
  };
}

function buildMembershipContext(): TenantMembershipContext {
  return {
    tenantUUID: 'tenant-uuid-456',
    role: 'OWNER',
    tenantStatus: 'active',
    tier: 'STARTER',
    usageCounts: { storageCount: 1, memberCount: 2, productCount: 5 },
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('GetMyPermissionsController', () => {
  let controller: GetMyPermissionsController;
  let tenantFacade: jest.Mocked<ITenantFacade>;
  let rbacPort: jest.Mocked<IRbacPolicyPort>;
  let dataSource: jest.Mocked<DataSource>;

  beforeEach(() => {
    tenantFacade = {
      getMembershipContext: jest.fn(),
    } as unknown as jest.Mocked<ITenantFacade>;

    rbacPort = {
      getRoleActions: jest.fn().mockResolvedValue(new Set(['STORAGE_READ', 'STORAGE_CREATE'])),
      getUserGrants: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<IRbacPolicyPort>;

    dataSource = {
      query: jest.fn().mockResolvedValue([{ tenant_id: 1, user_id: 42 }]),
    } as unknown as jest.Mocked<DataSource>;

    controller = new GetMyPermissionsController(tenantFacade, rbacPort, dataSource);
  });

  describe('Given the user has no active tenant membership', () => {
    describe('When getMyPermissions is called', () => {
      beforeEach(() => {
        tenantFacade.getMembershipContext.mockResolvedValue(null);
      });

      it('Then it throws HttpException with 403 and PERMISSION_DENIED', async () => {
        await expect(controller.getMyPermissions(buildUser())).rejects.toThrow(HttpException);

        try {
          await controller.getMyPermissions(buildUser());
        } catch (e) {
          expect((e as HttpException).getStatus()).toBe(HttpStatus.FORBIDDEN);
          const response = (e as HttpException).getResponse() as Record<string, unknown>;
          expect(response.error).toBe('PERMISSION_DENIED');
        }
      });
    });
  });

  describe('Given the user has an active tenant membership', () => {
    describe('When getMyPermissions is called', () => {
      beforeEach(() => {
        tenantFacade.getMembershipContext.mockResolvedValue(buildMembershipContext());
      });

      it('Then it returns the role, tier, actions, and grants', async () => {
        const result = await controller.getMyPermissions(buildUser());

        expect(result.role).toBe('OWNER');
        expect(result.tier).toBe('STARTER');
        expect(result.actions).toContain('STORAGE_READ');
        expect(result.grants).toEqual([]);
      });
    });
  });
});

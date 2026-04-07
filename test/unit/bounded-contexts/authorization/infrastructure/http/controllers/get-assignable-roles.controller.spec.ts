import { HttpException, HttpStatus } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { GetAssignableRolesController } from '@authorization/infrastructure/http/controllers/get-assignable-roles/get-assignable-roles.controller';
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

describe('GetAssignableRolesController', () => {
  let controller: GetAssignableRolesController;
  let tenantFacade: jest.Mocked<ITenantFacade>;
  let rbacPort: jest.Mocked<IRbacPolicyPort>;
  let dataSource: jest.Mocked<DataSource>;

  beforeEach(() => {
    tenantFacade = {
      getMembershipContext: jest.fn(),
    } as unknown as jest.Mocked<ITenantFacade>;

    rbacPort = {
      getAssignableRoles: jest.fn(),
    } as unknown as jest.Mocked<IRbacPolicyPort>;

    dataSource = {
      query: jest.fn(),
    } as unknown as jest.Mocked<DataSource>;

    controller = new GetAssignableRolesController(tenantFacade, rbacPort, dataSource);
  });

  describe('Given the user has no active tenant membership', () => {
    describe('When getAssignableRoles is called', () => {
      beforeEach(() => {
        tenantFacade.getMembershipContext.mockResolvedValue(null);
      });

      it('Then it throws HttpException with 403 and PERMISSION_DENIED', async () => {
        await expect(controller.getAssignableRoles(buildUser())).rejects.toThrow(HttpException);

        try {
          await controller.getAssignableRoles(buildUser());
        } catch (e) {
          expect((e as HttpException).getStatus()).toBe(HttpStatus.FORBIDDEN);
          const response = (e as HttpException).getResponse() as Record<string, unknown>;
          expect(response.error).toBe('PERMISSION_DENIED');
        }
      });
    });
  });

  describe('Given the user has an active membership but no assignable roles', () => {
    describe('When getAssignableRoles is called', () => {
      beforeEach(() => {
        tenantFacade.getMembershipContext.mockResolvedValue(buildMembershipContext());
        rbacPort.getAssignableRoles.mockResolvedValue([]);
      });

      it('Then it returns an empty array', async () => {
        const result = await controller.getAssignableRoles(buildUser());

        expect(result).toEqual([]);
        expect(dataSource.query).not.toHaveBeenCalled();
      });
    });
  });

  describe('Given the user has an active membership and can assign roles', () => {
    describe('When getAssignableRoles is called', () => {
      beforeEach(() => {
        tenantFacade.getMembershipContext.mockResolvedValue(buildMembershipContext());
        rbacPort.getAssignableRoles.mockResolvedValue(['MANAGER', 'VIEWER']);
        dataSource.query.mockResolvedValue([
          { key: 'MANAGER', name_en: 'Manager', name_es: 'Gerente' },
          { key: 'VIEWER', name_en: 'Viewer', name_es: 'Lector' },
        ]);
      });

      it('Then it returns the mapped role objects with localized names', async () => {
        const result = await controller.getAssignableRoles(buildUser());

        expect(result).toHaveLength(2);
        expect(result[0]).toEqual({ key: 'MANAGER', nameEn: 'Manager', nameEs: 'Gerente' });
        expect(result[1]).toEqual({ key: 'VIEWER', nameEn: 'Viewer', nameEs: 'Lector' });
      });
    });
  });
});

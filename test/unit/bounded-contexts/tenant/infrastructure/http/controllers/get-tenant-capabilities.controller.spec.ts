import { ForbiddenException } from '@nestjs/common';
import { GetTenantCapabilitiesController } from '@tenant/infrastructure/http/controllers/get-tenant-capabilities/get-tenant-capabilities.controller';
import { MediatorService } from '@shared/infrastructure/mediator/mediator.service';
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

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('GetTenantCapabilitiesController', () => {
  let controller: GetTenantCapabilitiesController;
  let mediator: jest.Mocked<MediatorService>;

  beforeEach(() => {
    mediator = {
      tenant: {
        getTierLimits: jest.fn(),
      },
    } as unknown as jest.Mocked<MediatorService>;

    controller = new GetTenantCapabilitiesController(mediator);
  });

  describe('Given the user has no active tenant membership', () => {
    describe('When handle is called', () => {
      beforeEach(() => {
        (mediator.tenant.getTierLimits as jest.Mock).mockResolvedValue(null);
      });

      it('Then it throws ForbiddenException with TIER_CONFIGURATION_MISSING', async () => {
        await expect(controller.handle(buildUser())).rejects.toThrow(ForbiddenException);

        try {
          await controller.handle(buildUser());
        } catch (e) {
          const response = (e as ForbiddenException).getResponse() as Record<string, unknown>;
          expect(response.error).toBe('TIER_CONFIGURATION_MISSING');
        }
      });
    });
  });

  describe('Given the user has an active tenant membership with tier limits', () => {
    describe('When handle is called', () => {
      beforeEach(() => {
        (mediator.tenant.getTierLimits as jest.Mock).mockResolvedValue({
          tier: 'STARTER',
          maxWarehouses: 3,
          maxUsers: 5,
          maxProducts: 1000,
          canInviteMembers: true,
        });
      });

      it('Then it returns the tenant capabilities DTO', async () => {
        const result = await controller.handle(buildUser());

        expect(result).toBeDefined();
      });
    });
  });
});

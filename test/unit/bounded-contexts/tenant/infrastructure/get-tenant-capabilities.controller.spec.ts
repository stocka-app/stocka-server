import { NotFoundException } from '@nestjs/common';
import { GetTenantCapabilitiesController } from '@tenant/infrastructure/http/controllers/get-tenant-capabilities/get-tenant-capabilities.controller';
import { TenantCapabilitiesOutDto } from '@tenant/infrastructure/http/controllers/get-tenant-capabilities/tenant-capabilities-out.dto';
import { MediatorService } from '@shared/infrastructure/mediator/mediator.service';
import type { JwtPayload } from '@common/decorators/current-user.decorator';
import type { TierLimits } from '@tenant/domain/contracts/tenant-facade.contract';

function buildMockMediator(
  tierLimits: TierLimits | null,
): Pick<MediatorService, 'tenant'> {
  return {
    tenant: {
      getTierLimits: jest.fn().mockResolvedValue(tierLimits),
    } as unknown as MediatorService['tenant'],
  };
}

function buildJwtPayload(overrides: Partial<JwtPayload> = {}): JwtPayload {
  return {
    uuid: '00000000-0000-0000-0000-000000000001',
    tenantId: '00000000-0000-0000-0000-000000000002',
    role: 'OWNER',
    tier: 'STARTER',
    ...overrides,
  } as JwtPayload;
}

describe('GetTenantCapabilitiesController', () => {
  describe('Given the user has an active tenant with tier limits', () => {
    it('Then the handler returns the tier limits as a TenantCapabilitiesOutDto', async () => {
      const tierLimits: TierLimits = {
        tier: 'STARTER',
        maxCustomRooms: 1,
        maxStoreRooms: 2,
        maxWarehouses: 3,
      };
      const mediator = buildMockMediator(tierLimits);
      const controller = new GetTenantCapabilitiesController(
        mediator as unknown as MediatorService,
      );

      const result = await controller.handle(buildJwtPayload());

      expect(result).toBeInstanceOf(TenantCapabilitiesOutDto);
      expect(result.tier).toBe('STARTER');
      expect(result.maxCustomRooms).toBe(1);
      expect(result.maxStoreRooms).toBe(2);
      expect(result.maxWarehouses).toBe(3);
    });
  });

  describe('Given the user has no active tenant (tenantId is null)', () => {
    it('Then the handler throws NotFoundException with the expected message', async () => {
      const mediator = buildMockMediator(null);
      const controller = new GetTenantCapabilitiesController(
        mediator as unknown as MediatorService,
      );

      await expect(controller.handle(buildJwtPayload())).rejects.toThrow(NotFoundException);
      await expect(controller.handle(buildJwtPayload())).rejects.toThrow(
        'No active tenant found for the current user',
      );
    });
  });
});

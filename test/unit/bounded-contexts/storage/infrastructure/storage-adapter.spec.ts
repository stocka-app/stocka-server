import { TenantCapabilitiesAdapter } from '@storage/infrastructure/adapters/tenant-capabilities.adapter';
import { MediatorService } from '@shared/infrastructure/mediator/mediator.service';
import { TierLimits } from '@tenant/domain/contracts/tenant-facade.contract';

const TENANT_UUID = '019538a0-0000-7000-8000-000000000001';

function makeMediator(limits: TierLimits | null): jest.Mocked<MediatorService> {
  return {
    tenant: {
      getTierLimitsByTenantUUID: jest.fn().mockResolvedValue(limits),
    },
  } as unknown as jest.Mocked<MediatorService>;
}

describe('TenantCapabilitiesAdapter', () => {
  describe('Given a tenant on the FREE tier', () => {
    describe('When getCapabilities is called', () => {
      it('Then canCreateWarehouse returns false', async () => {
        const adapter = new TenantCapabilitiesAdapter(
          makeMediator({ tier: 'FREE', maxWarehouses: 0, maxCustomRooms: 1, maxStoreRooms: 1 }),
        );
        const caps = await adapter.getCapabilities(TENANT_UUID);
        expect(caps.canCreateWarehouse()).toBe(false);
      });
    });
  });

  describe('Given a tenant on the STARTER tier with warehouse quota 3', () => {
    let caps: Awaited<ReturnType<TenantCapabilitiesAdapter['getCapabilities']>>;

    beforeEach(async () => {
      const adapter = new TenantCapabilitiesAdapter(
        makeMediator({
          tier: 'STARTER',
          maxWarehouses: 3,
          maxCustomRooms: 5,
          maxStoreRooms: 5,
        }),
      );
      caps = await adapter.getCapabilities(TENANT_UUID);
    });

    describe('When checking warehouse creation eligibility', () => {
      it('Then canCreateWarehouse returns true', () => {
        expect(caps.canCreateWarehouse()).toBe(true);
      });

      it('Then canCreateMoreWarehouses(0) returns true', () => {
        expect(caps.canCreateMoreWarehouses(0)).toBe(true);
      });

      it('Then canCreateMoreWarehouses(2) returns true', () => {
        expect(caps.canCreateMoreWarehouses(2)).toBe(true);
      });

      it('Then canCreateMoreWarehouses(3) returns false', () => {
        expect(caps.canCreateMoreWarehouses(3)).toBe(false);
      });
    });

    describe('When checking custom room creation eligibility', () => {
      it('Then canCreateMoreCustomRooms(4) returns true', () => {
        expect(caps.canCreateMoreCustomRooms(4)).toBe(true);
      });

      it('Then canCreateMoreCustomRooms(5) returns false', () => {
        expect(caps.canCreateMoreCustomRooms(5)).toBe(false);
      });
    });

    describe('When checking store room creation eligibility', () => {
      it('Then canCreateMoreStoreRooms(4) returns true', () => {
        expect(caps.canCreateMoreStoreRooms(4)).toBe(true);
      });

      it('Then canCreateMoreStoreRooms(5) returns false', () => {
        expect(caps.canCreateMoreStoreRooms(5)).toBe(false);
      });
    });
  });

  describe('Given a tenant on ENTERPRISE tier with unlimited quotas (-1)', () => {
    let caps: Awaited<ReturnType<TenantCapabilitiesAdapter['getCapabilities']>>;

    beforeEach(async () => {
      const adapter = new TenantCapabilitiesAdapter(
        makeMediator({
          tier: 'ENTERPRISE',
          maxWarehouses: -1,
          maxCustomRooms: -1,
          maxStoreRooms: -1,
        }),
      );
      caps = await adapter.getCapabilities(TENANT_UUID);
    });

    describe('When checking creation eligibility at any count', () => {
      it('Then canCreateWarehouse returns true', () => {
        expect(caps.canCreateWarehouse()).toBe(true);
      });

      it('Then canCreateMoreWarehouses(9999) returns true', () => {
        expect(caps.canCreateMoreWarehouses(9999)).toBe(true);
      });

      it('Then canCreateMoreCustomRooms(9999) returns true', () => {
        expect(caps.canCreateMoreCustomRooms(9999)).toBe(true);
      });

      it('Then canCreateMoreStoreRooms(9999) returns true', () => {
        expect(caps.canCreateMoreStoreRooms(9999)).toBe(true);
      });
    });
  });
});

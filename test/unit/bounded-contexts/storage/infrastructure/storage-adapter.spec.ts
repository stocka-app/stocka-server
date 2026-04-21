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

  describe('Given no tier limits are available (tenant has no config)', () => {
    describe('When getCapabilities is called', () => {
      it('Then it returns conservative defaults: warehouse=0, customRoom=1, storeRoom=1', async () => {
        const adapter = new TenantCapabilitiesAdapter(makeMediator(null));
        const caps = await adapter.getCapabilities(TENANT_UUID);

        expect(caps.canCreateWarehouse()).toBe(false); // maxWarehouses = 0
        expect(caps.canCreateMoreCustomRooms(0)).toBe(true); // maxCustomRooms = 1 → 0 < 1
        expect(caps.canCreateMoreCustomRooms(1)).toBe(false); // 1 < 1 = false
        expect(caps.canCreateMoreStoreRooms(0)).toBe(true); // maxStoreRooms = 1 → 0 < 1
        expect(caps.canCreateMoreStoreRooms(1)).toBe(false); // 1 < 1 = false
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

      it('Then exceedsWarehouseLimit(9999) returns false', () => {
        expect(caps.exceedsWarehouseLimit(9999)).toBe(false);
      });

      it('Then exceedsStoreRoomLimit(9999) returns false', () => {
        expect(caps.exceedsStoreRoomLimit(9999)).toBe(false);
      });

      it('Then exceedsCustomRoomLimit(9999) returns false', () => {
        expect(caps.exceedsCustomRoomLimit(9999)).toBe(false);
      });
    });
  });

  describe('Given a tenant on STARTER tier evaluating overflow predicates', () => {
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

    it('Then exceedsWarehouseLimit returns false at the limit and true above it', () => {
      expect(caps.exceedsWarehouseLimit(3)).toBe(false);
      expect(caps.exceedsWarehouseLimit(4)).toBe(true);
    });

    it('Then exceedsStoreRoomLimit returns false at the limit and true above it', () => {
      expect(caps.exceedsStoreRoomLimit(5)).toBe(false);
      expect(caps.exceedsStoreRoomLimit(6)).toBe(true);
    });

    it('Then exceedsCustomRoomLimit returns false at the limit and true above it', () => {
      expect(caps.exceedsCustomRoomLimit(5)).toBe(false);
      expect(caps.exceedsCustomRoomLimit(6)).toBe(true);
    });
  });
});

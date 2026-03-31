import { TierPlanModel } from '@tenant/domain/models/tier-plan.model';
import { TierEnum } from '@authorization/domain/enums/tier.enum';

describe('TierPlanModel', () => {
  describe('Given valid reconstitute props for a FREE tier plan', () => {
    describe('When reconstituting from storage', () => {
      let model: TierPlanModel;

      beforeEach(() => {
        model = TierPlanModel.reconstitute({
          tier: 'FREE',
          name: 'Free',
          maxProducts: 100,
          maxUsers: 1,
          maxWarehouses: 0,
          maxCustomRooms: 1,
          maxStoreRooms: 1,
          policyVersion: new Date('2024-01-01'),
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        });
      });

      it('Then the tier is FREE', () => {
        expect(model.tier).toBe(TierEnum.FREE);
      });

      it('Then the name is Free', () => {
        expect(model.name).toBe('Free');
      });

      it('Then the limits are set to free-tier values', () => {
        expect(model.maxProducts).toBe(100);
        expect(model.maxUsers).toBe(1);
        expect(model.maxWarehouses).toBe(0);
        expect(model.maxCustomRooms).toBe(1);
        expect(model.maxStoreRooms).toBe(1);
      });

      it('Then products are not unlimited', () => {
        expect(model.isUnlimitedProducts()).toBe(false);
      });

      it('Then users are not unlimited', () => {
        expect(model.isUnlimitedUsers()).toBe(false);
      });

      it('Then warehouses are not unlimited', () => {
        expect(model.isUnlimitedWarehouses()).toBe(false);
      });

      it('Then custom rooms are not unlimited', () => {
        expect(model.isUnlimitedCustomRooms()).toBe(false);
      });

      it('Then store rooms are not unlimited', () => {
        expect(model.isUnlimitedStoreRooms()).toBe(false);
      });

      it('Then the policyVersion is set', () => {
        expect(model.policyVersion).toEqual(new Date('2024-01-01'));
      });

      it('Then timestamps are set', () => {
        expect(model.createdAt).toEqual(new Date('2024-01-01'));
        expect(model.updatedAt).toEqual(new Date('2024-01-01'));
      });
    });
  });

  describe('Given valid reconstitute props for an ENTERPRISE tier plan', () => {
    describe('When reconstituting from storage', () => {
      let model: TierPlanModel;

      beforeEach(() => {
        model = TierPlanModel.reconstitute({
          tier: 'ENTERPRISE',
          name: 'Enterprise',
          maxProducts: null,
          maxUsers: null,
          maxWarehouses: null,
          maxCustomRooms: -1,
          maxStoreRooms: -1,
          policyVersion: new Date('2024-06-01'),
          createdAt: new Date('2024-06-01'),
          updatedAt: new Date('2024-06-01'),
        });
      });

      it('Then the tier is ENTERPRISE', () => {
        expect(model.tier).toBe(TierEnum.ENTERPRISE);
      });

      it('Then products are unlimited', () => {
        expect(model.maxProducts).toBeNull();
        expect(model.isUnlimitedProducts()).toBe(true);
      });

      it('Then users are unlimited', () => {
        expect(model.maxUsers).toBeNull();
        expect(model.isUnlimitedUsers()).toBe(true);
      });

      it('Then custom rooms are unlimited', () => {
        expect(model.maxCustomRooms).toBe(-1);
        expect(model.isUnlimitedCustomRooms()).toBe(true);
      });

      it('Then store rooms are unlimited', () => {
        expect(model.maxStoreRooms).toBe(-1);
        expect(model.isUnlimitedStoreRooms()).toBe(true);
      });
    });
  });

  describe('Given valid reconstitute props for a STARTER tier plan', () => {
    describe('When reconstituting from storage', () => {
      it('Then all limits are set correctly', () => {
        const model = TierPlanModel.reconstitute({
          tier: 'STARTER',
          name: 'Starter',
          maxProducts: 1000,
          maxUsers: 5,
          maxWarehouses: 3,
          maxCustomRooms: 3,
          maxStoreRooms: 3,
          policyVersion: new Date('2024-01-01'),
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        });

        expect(model.tier).toBe(TierEnum.STARTER);
        expect(model.name).toBe('Starter');
        expect(model.maxProducts).toBe(1000);
        expect(model.maxUsers).toBe(5);
        expect(model.maxWarehouses).toBe(3);
        expect(model.maxCustomRooms).toBe(3);
        expect(model.maxStoreRooms).toBe(3);
        expect(model.isUnlimitedCustomRooms()).toBe(false);
        expect(model.isUnlimitedStoreRooms()).toBe(false);
      });
    });
  });

  describe('Given valid reconstitute props for a GROWTH tier plan', () => {
    describe('When reconstituting from storage', () => {
      it('Then all limits are set correctly', () => {
        const model = TierPlanModel.reconstitute({
          tier: 'GROWTH',
          name: 'Growth',
          maxProducts: 5000,
          maxUsers: 25,
          maxWarehouses: 10,
          maxCustomRooms: 10,
          maxStoreRooms: 10,
          policyVersion: new Date('2024-01-01'),
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        });

        expect(model.tier).toBe(TierEnum.GROWTH);
        expect(model.maxProducts).toBe(5000);
        expect(model.maxUsers).toBe(25);
        expect(model.maxWarehouses).toBe(10);
        expect(model.maxCustomRooms).toBe(10);
        expect(model.maxStoreRooms).toBe(10);
        expect(model.isUnlimitedCustomRooms()).toBe(false);
        expect(model.isUnlimitedStoreRooms()).toBe(false);
      });
    });
  });

  describe('Given an invalid tier value', () => {
    describe('When reconstitute is called', () => {
      it('Then it throws an error', () => {
        expect(() =>
          TierPlanModel.reconstitute({
            tier: 'INVALID',
            name: 'Invalid',
            maxProducts: 100,
            maxUsers: 1,
            maxWarehouses: 0,
            maxCustomRooms: 0,
            maxStoreRooms: 0,
            policyVersion: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
        ).toThrow('Invalid tier value: INVALID');
      });
    });
  });
});

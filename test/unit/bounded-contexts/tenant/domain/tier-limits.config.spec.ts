import { getTierLimits, TIER_LIMITS_CONFIG } from '@tenant/domain/config/tier-limits.config';

describe('TierLimitsConfig', () => {
  describe('Given the FREE tier', () => {
    describe('When getTierLimits is called with FREE', () => {
      it('Then it returns free-tier limits', () => {
        const limits = getTierLimits('FREE');
        expect(limits.maxWarehouses).toBe(0);
        expect(limits.maxCustomRooms).toBe(1);
        expect(limits.maxStoreRooms).toBe(1);
        expect(limits.maxUsers).toBe(1);
        expect(limits.maxProducts).toBe(100);
        expect(limits.invitationsEnabled).toBe(false);
        expect(limits.advancedReportsEnabled).toBe(false);
      });
    });
  });

  describe('Given the STARTER tier', () => {
    describe('When getTierLimits is called with STARTER', () => {
      it('Then it returns starter-tier limits', () => {
        const limits = getTierLimits('STARTER');
        expect(limits.maxWarehouses).toBe(1);
        expect(limits.maxCustomRooms).toBe(3);
        expect(limits.maxStoreRooms).toBe(3);
        expect(limits.maxUsers).toBe(5);
        expect(limits.maxProducts).toBe(1000);
        expect(limits.invitationsEnabled).toBe(true);
        expect(limits.advancedReportsEnabled).toBe(false);
      });
    });
  });

  describe('Given the GROWTH tier', () => {
    describe('When getTierLimits is called with GROWTH', () => {
      it('Then it returns growth-tier limits', () => {
        const limits = getTierLimits('GROWTH');
        expect(limits.maxWarehouses).toBe(1);
        expect(limits.maxCustomRooms).toBe(10);
        expect(limits.maxStoreRooms).toBe(10);
        expect(limits.maxUsers).toBe(25);
        expect(limits.maxProducts).toBe(5000);
        expect(limits.invitationsEnabled).toBe(true);
        expect(limits.advancedReportsEnabled).toBe(true);
      });
    });
  });

  describe('Given the ENTERPRISE tier', () => {
    describe('When getTierLimits is called with ENTERPRISE', () => {
      it('Then it returns unlimited limits', () => {
        const limits = getTierLimits('ENTERPRISE');
        expect(limits.maxWarehouses).toBe(-1);
        expect(limits.maxCustomRooms).toBe(-1);
        expect(limits.maxStoreRooms).toBe(-1);
        expect(limits.maxUsers).toBe(-1);
        expect(limits.maxProducts).toBe(-1);
        expect(limits.invitationsEnabled).toBe(true);
        expect(limits.advancedReportsEnabled).toBe(true);
      });
    });
  });

  describe('Given an unknown tier', () => {
    describe('When getTierLimits is called with an unrecognized string', () => {
      it('Then it falls back to FREE limits', () => {
        const limits = getTierLimits('UNKNOWN');
        expect(limits).toEqual(TIER_LIMITS_CONFIG['FREE']);
      });
    });
  });

  describe('Given all tiers in TIER_LIMITS_CONFIG', () => {
    describe('When checking the config object', () => {
      it('Then it has exactly 4 tiers defined', () => {
        expect(Object.keys(TIER_LIMITS_CONFIG)).toHaveLength(4);
        expect(Object.keys(TIER_LIMITS_CONFIG)).toEqual(
          expect.arrayContaining(['FREE', 'STARTER', 'GROWTH', 'ENTERPRISE']),
        );
      });
    });
  });
});

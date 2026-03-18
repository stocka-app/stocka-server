import { SystemAction } from '@shared/domain/policy/actions-catalog';
import { TierEnum } from '@shared/domain/policy/tier.enum';
import { MemberRoleEnum } from '@shared/domain/policy/member-role.enum';
import {
  ACTION_TIER_REQUIREMENTS,
  ROLE_ALLOWED_ACTIONS,
  TIER_NUMERIC_LIMITS,
  ACTION_LIMIT_CHECKS,
  TIER_ORDER,
} from '@shared/domain/policy/tier-policy.config';

describe('TierPolicyConfig', () => {
  describe('Given the ACTION_TIER_REQUIREMENTS table', () => {
    describe('When checking coverage', () => {
      it('Then every SystemAction has a defined tier requirement', () => {
        for (const action of Object.values(SystemAction)) {
          expect(ACTION_TIER_REQUIREMENTS[action]).toBeDefined();
        }
      });
    });
  });

  describe('Given the ROLE_ALLOWED_ACTIONS table', () => {
    describe('When checking coverage', () => {
      it('Then every MemberRoleEnum has a defined set of allowed actions', () => {
        for (const role of Object.values(MemberRoleEnum)) {
          expect(ROLE_ALLOWED_ACTIONS[role]).toBeDefined();
          expect(ROLE_ALLOWED_ACTIONS[role].size).toBeGreaterThan(0);
        }
      });

      it('Then OWNER has access to all actions', () => {
        const ownerActions = ROLE_ALLOWED_ACTIONS[MemberRoleEnum.OWNER];
        for (const action of Object.values(SystemAction)) {
          expect(ownerActions.has(action)).toBe(true);
        }
      });

      it('Then VIEWER only has read-level actions', () => {
        const viewerActions = ROLE_ALLOWED_ACTIONS[MemberRoleEnum.VIEWER];
        expect(viewerActions.has(SystemAction.PRODUCT_READ)).toBe(true);
        expect(viewerActions.has(SystemAction.STORAGE_READ)).toBe(true);
        expect(viewerActions.has(SystemAction.PRODUCT_CREATE)).toBe(false);
        expect(viewerActions.has(SystemAction.STORAGE_CREATE)).toBe(false);
        expect(viewerActions.has(SystemAction.TENANT_SETTINGS_UPDATE)).toBe(false);
      });
    });
  });

  describe('Given the TIER_NUMERIC_LIMITS table', () => {
    describe('When checking coverage', () => {
      it('Then every TierEnum has defined numeric limits', () => {
        for (const tier of Object.values(TierEnum)) {
          expect(TIER_NUMERIC_LIMITS[tier]).toBeDefined();
        }
      });

      it('Then FREE tier has the most restrictive limits', () => {
        expect(TIER_NUMERIC_LIMITS[TierEnum.FREE].storageCount).toBe(0);
        expect(TIER_NUMERIC_LIMITS[TierEnum.FREE].memberCount).toBe(1);
        expect(TIER_NUMERIC_LIMITS[TierEnum.FREE].productCount).toBe(100);
      });

      it('Then ENTERPRISE tier has unlimited limits (-1)', () => {
        expect(TIER_NUMERIC_LIMITS[TierEnum.ENTERPRISE].storageCount).toBe(-1);
        expect(TIER_NUMERIC_LIMITS[TierEnum.ENTERPRISE].memberCount).toBe(-1);
        expect(TIER_NUMERIC_LIMITS[TierEnum.ENTERPRISE].productCount).toBe(-1);
      });
    });
  });

  describe('Given the ACTION_LIMIT_CHECKS table', () => {
    describe('When checking which actions trigger limit enforcement', () => {
      it('Then STORAGE_CREATE checks the storageCount', () => {
        expect(ACTION_LIMIT_CHECKS[SystemAction.STORAGE_CREATE]).toBe('storageCount');
      });

      it('Then MEMBER_INVITE checks the memberCount', () => {
        expect(ACTION_LIMIT_CHECKS[SystemAction.MEMBER_INVITE]).toBe('memberCount');
      });

      it('Then PRODUCT_CREATE checks the productCount', () => {
        expect(ACTION_LIMIT_CHECKS[SystemAction.PRODUCT_CREATE]).toBe('productCount');
      });

      it('Then PRODUCT_READ does not trigger a limit check', () => {
        expect(ACTION_LIMIT_CHECKS[SystemAction.PRODUCT_READ]).toBeUndefined();
      });
    });
  });

  describe('Given the TIER_ORDER table', () => {
    describe('When comparing tier precedence', () => {
      it('Then FREE is lower than STARTER', () => {
        expect(TIER_ORDER[TierEnum.FREE]).toBeLessThan(TIER_ORDER[TierEnum.STARTER]);
      });

      it('Then STARTER is lower than GROWTH', () => {
        expect(TIER_ORDER[TierEnum.STARTER]).toBeLessThan(TIER_ORDER[TierEnum.GROWTH]);
      });

      it('Then GROWTH is lower than ENTERPRISE', () => {
        expect(TIER_ORDER[TierEnum.GROWTH]).toBeLessThan(TIER_ORDER[TierEnum.ENTERPRISE]);
      });
    });
  });
});

import { RbacBootValidator } from '@authorization/infrastructure/services/rbac-boot-validator';
import { MemberRoleEnum } from '@authorization/domain/enums/member-role.enum';
import { SystemAction } from '@authorization/domain/enums/actions-catalog';
import { TierEnum } from '@authorization/domain/enums/tier.enum';
import { DataSource } from 'typeorm';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildDataSource(overrides: {
  roles?: { key: string }[];
  actions?: { key: string }[];
  tiers?: { tier: string }[];
}): DataSource {
  const allRoles = Object.values(MemberRoleEnum).map((k) => ({ key: k }));
  const allActions = Object.values(SystemAction).map((k) => ({ key: k }));
  const allTiers = Object.values(TierEnum).map((t) => ({ tier: t }));

  return {
    query: jest.fn().mockImplementation((sql: string) => {
      if (sql.includes('authz.roles')) return Promise.resolve(overrides.roles ?? allRoles);
      if (sql.includes('catalog_actions')) return Promise.resolve(overrides.actions ?? allActions);
      if (sql.includes('tier_plans')) return Promise.resolve(overrides.tiers ?? allTiers);
      return Promise.resolve([]);
    }),
  } as unknown as DataSource;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Given the application is booting and RBAC tables need validation', () => {
  describe('When all roles, actions, and tiers are present in the database', () => {
    it('Then onModuleInit resolves without throwing', async () => {
      const validator = new RbacBootValidator(buildDataSource({}));
      await expect(validator.onModuleInit()).resolves.toBeUndefined();
    });
  });

  describe('When one or more MemberRoleEnum values are missing from authz.roles', () => {
    it('Then onModuleInit throws with the missing role keys listed', async () => {
      const roles = Object.values(MemberRoleEnum)
        .filter((r) => r !== MemberRoleEnum.VIEWER)
        .map((k) => ({ key: k }));

      const validator = new RbacBootValidator(buildDataSource({ roles }));
      await expect(validator.onModuleInit()).rejects.toThrow(
        /RBAC boot validation failed: MemberRoleEnum values missing in authz\.roles: VIEWER/,
      );
    });
  });

  describe('When one or more SystemAction values are missing from catalog_actions', () => {
    it('Then onModuleInit throws with the missing action keys listed', async () => {
      const actions = Object.values(SystemAction)
        .filter((a) => a !== SystemAction.STORAGE_CREATE)
        .map((k) => ({ key: k }));

      const validator = new RbacBootValidator(buildDataSource({ actions }));
      await expect(validator.onModuleInit()).rejects.toThrow(
        /RBAC boot validation failed: SystemAction values missing in catalog_actions: STORAGE_CREATE/,
      );
    });
  });

  describe('When one or more TierEnum values are missing from tier_plans', () => {
    it('Then onModuleInit throws with the missing tier values listed', async () => {
      const tiers = Object.values(TierEnum)
        .filter((t) => t !== TierEnum.ENTERPRISE)
        .map((t) => ({ tier: t }));

      const validator = new RbacBootValidator(buildDataSource({ tiers }));
      await expect(validator.onModuleInit()).rejects.toThrow(
        /RBAC boot validation failed: TierEnum values missing in tier_plans: ENTERPRISE/,
      );
    });
  });

  describe('When the database returns an empty result for all tables', () => {
    it('Then onModuleInit throws reporting all enum values as missing', async () => {
      const validator = new RbacBootValidator(
        buildDataSource({ roles: [], actions: [], tiers: [] }),
      );
      await expect(validator.onModuleInit()).rejects.toThrow(/MemberRoleEnum values missing/);
    });
  });
});

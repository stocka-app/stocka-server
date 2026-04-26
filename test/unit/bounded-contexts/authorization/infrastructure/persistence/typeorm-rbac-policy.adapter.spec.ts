import type { DataSource } from 'typeorm';
import { TypeOrmRbacPolicyAdapter } from '@authorization/infrastructure/persistence/repositories/typeorm-rbac-policy.adapter';

interface QueryStub {
  (sql: string, params?: unknown[]): Promise<unknown[]>;
}

function makeDataSource(handler: QueryStub): DataSource {
  return {
    query: jest.fn(handler),
  } as unknown as DataSource;
}

describe('TypeOrmRbacPolicyAdapter', () => {
  describe('getRoleActions', () => {
    describe('Given the role has a set of action grants', () => {
      it('Then it returns a Set of action keys', async () => {
        const dataSource = makeDataSource(async () => [
          { action_key: 'STORAGE_CREATE' },
          { action_key: 'STORAGE_LIST' },
        ]);
        const sut = new TypeOrmRbacPolicyAdapter(dataSource);

        const actions = await sut.getRoleActions('OWNER');

        expect(actions.has('STORAGE_CREATE')).toBe(true);
        expect(actions.has('STORAGE_LIST')).toBe(true);
      });
    });

    describe('Given the role actions are queried twice', () => {
      it('Then the second call uses the cache (no extra query)', async () => {
        const handler = jest.fn(async () => [{ action_key: 'STORAGE_LIST' }]);
        const dataSource = makeDataSource(handler);
        const sut = new TypeOrmRbacPolicyAdapter(dataSource);

        await sut.getRoleActions('OWNER');
        await sut.getRoleActions('OWNER');

        expect(handler).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('getActionTierRequirements', () => {
    describe('Given actions and overrides', () => {
      it('Then it derives the minimum tier per action', async () => {
        const handler = jest.fn(async (sql: string) => {
          if (sql.includes('tier_action_overrides')) {
            return [
              { action_key: 'STORAGE_CREATE', tier: 'FREE', enabled: false },
              { action_key: 'STORAGE_CREATE', tier: 'STARTER', enabled: true },
            ];
          }
          if (sql.includes('catalog_actions')) {
            return [{ key: 'STORAGE_CREATE' }, { key: 'PRODUCT_CREATE' }];
          }
          if (sql.includes('tier_plans')) {
            return [
              { tier: 'FREE', tier_order: 0 },
              { tier: 'STARTER', tier_order: 1 },
              { tier: 'GROWTH', tier_order: 2 },
              { tier: 'ENTERPRISE', tier_order: 3 },
            ];
          }
          return [];
        });
        const dataSource = makeDataSource(handler);
        const sut = new TypeOrmRbacPolicyAdapter(dataSource);

        const result = await sut.getActionTierRequirements();

        expect(result.STORAGE_CREATE).toBe('STARTER');
        expect(result.PRODUCT_CREATE).toBe('FREE');
      });
    });
  });

  describe('getTierNumericLimits', () => {
    describe('Given a tier with finite limits', () => {
      it('Then storageCount is the sum of warehouses + custom + store rooms', async () => {
        const dataSource = makeDataSource(async () => [
          {
            max_products: 1000,
            max_users: 5,
            max_warehouses: 3,
            max_custom_rooms: 1,
            max_store_rooms: 1,
          },
        ]);
        const sut = new TypeOrmRbacPolicyAdapter(dataSource);

        const limits = await sut.getTierNumericLimits('STARTER');

        expect(limits.storageCount).toBe(5);
        expect(limits.memberCount).toBe(5);
        expect(limits.productCount).toBe(1000);
      });
    });

    describe('Given a tier with at least one unlimited storage type', () => {
      it('Then storageCount is -1 (unlimited)', async () => {
        const dataSource = makeDataSource(async () => [
          {
            max_products: -1,
            max_users: -1,
            max_warehouses: -1,
            max_custom_rooms: 5,
            max_store_rooms: 5,
          },
        ]);
        const sut = new TypeOrmRbacPolicyAdapter(dataSource);

        const limits = await sut.getTierNumericLimits('ENTERPRISE');

        expect(limits.storageCount).toBe(-1);
      });
    });

    describe('Given a tier with NULL max_products/max_users', () => {
      it('Then it falls back to safe defaults', async () => {
        const dataSource = makeDataSource(async () => [
          {
            max_products: null,
            max_users: null,
            max_warehouses: 1,
            max_custom_rooms: 1,
            max_store_rooms: 1,
          },
        ]);
        const sut = new TypeOrmRbacPolicyAdapter(dataSource);

        const limits = await sut.getTierNumericLimits('FREE');

        expect(limits.memberCount).toBe(1);
        expect(limits.productCount).toBe(100);
      });
    });
  });

  describe('getTierOrder', () => {
    describe('Given the tier_plans table has ordered rows', () => {
      it('Then it returns a record from tier name to its order', async () => {
        const dataSource = makeDataSource(async () => [
          { tier: 'FREE', tier_order: 0 },
          { tier: 'STARTER', tier_order: 1 },
        ]);
        const sut = new TypeOrmRbacPolicyAdapter(dataSource);

        const order = await sut.getTierOrder();

        expect(order).toEqual({ FREE: 0, STARTER: 1 });
      });
    });
  });

  describe('getActionLimitChecks', () => {
    describe('Given the structural action-to-counter mapping', () => {
      it('Then it returns the static map', async () => {
        const sut = new TypeOrmRbacPolicyAdapter(makeDataSource(async () => []));
        const result = await sut.getActionLimitChecks();
        expect(result).toEqual({
          STORAGE_CREATE: 'storageCount',
          MEMBER_INVITE: 'memberCount',
          PRODUCT_CREATE: 'productCount',
        });
      });
    });
  });

  describe('getAssignableRoles', () => {
    describe('Given a role with delegation rules', () => {
      it('Then it returns the list of target role keys', async () => {
        const dataSource = makeDataSource(async () => [
          { target_role_key: 'BUYER' },
          { target_role_key: 'WAREHOUSE_KEEPER' },
        ]);
        const sut = new TypeOrmRbacPolicyAdapter(dataSource);

        const roles = await sut.getAssignableRoles('OWNER');

        expect(roles).toEqual(['BUYER', 'WAREHOUSE_KEEPER']);
      });
    });
  });

  describe('Cache hits for tier-scoped queries', () => {
    describe('Given getActionTierRequirements is called twice', () => {
      it('Then the second call uses the cache', async () => {
        const handler = jest.fn(async (sql: string) => {
          if (sql.includes('tier_action_overrides')) return [];
          if (sql.includes('catalog_actions')) return [{ key: 'STORAGE_CREATE' }];
          if (sql.includes('tier_plans')) return [{ tier: 'FREE', tier_order: 0 }];
          return [];
        });
        const sut = new TypeOrmRbacPolicyAdapter(makeDataSource(handler));

        await sut.getActionTierRequirements();
        await sut.getActionTierRequirements();

        expect(handler).toHaveBeenCalledTimes(3);
      });
    });

    describe('Given getTierNumericLimits is called twice for the same tier', () => {
      it('Then the second call returns the cached limits', async () => {
        const handler = jest.fn(async () => [
          {
            max_products: 1000,
            max_users: 5,
            max_warehouses: 3,
            max_custom_rooms: 1,
            max_store_rooms: 1,
          },
        ]);
        const sut = new TypeOrmRbacPolicyAdapter(makeDataSource(handler));

        await sut.getTierNumericLimits('STARTER');
        await sut.getTierNumericLimits('STARTER');

        expect(handler).toHaveBeenCalledTimes(1);
      });
    });

    describe('Given getTierOrder is called twice', () => {
      it('Then the second call returns the cached order', async () => {
        const handler = jest.fn(async () => [{ tier: 'FREE', tier_order: 0 }]);
        const sut = new TypeOrmRbacPolicyAdapter(makeDataSource(handler));

        await sut.getTierOrder();
        await sut.getTierOrder();

        expect(handler).toHaveBeenCalledTimes(1);
      });
    });

    describe('Given getAssignableRoles is called twice for the same role', () => {
      it('Then the second call returns the cached roles', async () => {
        const handler = jest.fn(async () => [{ target_role_key: 'BUYER' }]);
        const sut = new TypeOrmRbacPolicyAdapter(makeDataSource(handler));

        await sut.getAssignableRoles('OWNER');
        await sut.getAssignableRoles('OWNER');

        expect(handler).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('getUserGrants', () => {
    describe('Given a user with explicit action grants in the tenant', () => {
      it('Then it returns the granted action keys', async () => {
        const dataSource = makeDataSource(async () => [{ action_key: 'STORAGE_CREATE' }]);
        const sut = new TypeOrmRbacPolicyAdapter(dataSource);

        const grants = await sut.getUserGrants(17, 42);

        expect(grants).toEqual(['STORAGE_CREATE']);
      });
    });
  });
});

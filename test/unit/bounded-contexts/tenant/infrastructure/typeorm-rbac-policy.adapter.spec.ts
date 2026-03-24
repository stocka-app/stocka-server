import { DataSource } from 'typeorm';
import { TypeOrmRbacPolicyAdapter } from '@tenant/infrastructure/repositories/typeorm-rbac-policy.adapter';

// ─── Mock setup ───────────────────────────────────────────────────────────────

const mockQuery = jest.fn();
const mockDataSource = { query: mockQuery } as unknown as DataSource;

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('TypeOrmRbacPolicyAdapter', () => {
  let adapter: TypeOrmRbacPolicyAdapter;

  beforeEach(() => {
    mockQuery.mockReset();
    adapter = new TypeOrmRbacPolicyAdapter(mockDataSource);
  });

  // ── getRoleActions ────────────────────────────────────────────────────────

  describe('Given the adapter needs role actions for a role that is not yet cached', () => {
    describe('When getRoleActions is called and no cache entry exists', () => {
      it('Then it queries the DB and returns a Set of action keys', async () => {
        mockQuery.mockResolvedValueOnce([
          { action_key: 'STORAGE_CREATE' },
          { action_key: 'PRODUCT_READ' },
        ]);

        const result = await adapter.getRoleActions('OWNER');

        expect(mockQuery).toHaveBeenCalledTimes(1);
        expect(mockQuery).toHaveBeenCalledWith(
          `SELECT action_key FROM authz.role_action_grants WHERE role_key = $1`,
          ['OWNER'],
        );
        expect(result).toBeInstanceOf(Set);
        expect(result.has('STORAGE_CREATE')).toBe(true);
        expect(result.has('PRODUCT_READ')).toBe(true);
        expect(result.size).toBe(2);
      });
    });

    describe('When getRoleActions is called a second time for the same role', () => {
      it('Then it returns the cached result without querying the DB again', async () => {
        mockQuery.mockResolvedValueOnce([{ action_key: 'PRODUCT_READ' }]);

        const first = await adapter.getRoleActions('VIEWER');
        const second = await adapter.getRoleActions('VIEWER');

        expect(mockQuery).toHaveBeenCalledTimes(1);
        expect(second).toBe(first);
      });
    });

    describe('When the DB returns empty rows', () => {
      it('Then it returns an empty Set', async () => {
        mockQuery.mockResolvedValueOnce([]);

        const result = await adapter.getRoleActions('SALES_REP');

        expect(result).toBeInstanceOf(Set);
        expect(result.size).toBe(0);
      });
    });
  });

  describe('Given a cached role-actions entry that has passed the SHORT TTL (10 min)', () => {
    beforeAll(() => jest.useFakeTimers());
    afterAll(() => jest.useRealTimers());

    beforeEach(() => {
      mockQuery.mockReset();
      adapter = new TypeOrmRbacPolicyAdapter(mockDataSource);
    });

    describe('When getRoleActions is called after the SHORT TTL expires', () => {
      it('Then it re-queries the DB for fresh data', async () => {
        mockQuery.mockResolvedValueOnce([{ action_key: 'PRODUCT_READ' }]);
        await adapter.getRoleActions('MANAGER');

        jest.advanceTimersByTime(11 * 60 * 1000);

        mockQuery.mockResolvedValueOnce([
          { action_key: 'PRODUCT_READ' },
          { action_key: 'STORAGE_CREATE' },
        ]);
        const result = await adapter.getRoleActions('MANAGER');

        expect(mockQuery).toHaveBeenCalledTimes(2);
        expect(result.has('STORAGE_CREATE')).toBe(true);
      });
    });
  });

  // ── getActionTierRequirements ─────────────────────────────────────────────

  describe('Given the adapter needs to resolve tier requirements for all actions', () => {
    describe('When there are no overrides for any action', () => {
      it('Then all actions map to FREE', async () => {
        // Query 1: COALESCE query (result unused by the logic)
        mockQuery.mockResolvedValueOnce([]);
        // Query 2: allActions
        mockQuery.mockResolvedValueOnce([
          { key: 'PRODUCT_READ' },
          { key: 'STORAGE_READ' },
        ]);
        // Query 3: overrides (empty — no overrides)
        mockQuery.mockResolvedValueOnce([]);
        // Query 4: tierRows
        mockQuery.mockResolvedValueOnce([
          { tier: 'FREE', tier_order: 0 },
          { tier: 'STARTER', tier_order: 1 },
        ]);

        const result = await adapter.getActionTierRequirements();

        expect(result['PRODUCT_READ']).toBe('FREE');
        expect(result['STORAGE_READ']).toBe('FREE');
      });
    });

    describe('When an action has an override that disables it at FREE but enables it at STARTER', () => {
      it('Then that action maps to STARTER', async () => {
        // Query 1: COALESCE query
        mockQuery.mockResolvedValueOnce([]);
        // Query 2: allActions
        mockQuery.mockResolvedValueOnce([{ key: 'STORAGE_CREATE' }]);
        // Query 3: overrides — STORAGE_CREATE is disabled at FREE
        mockQuery.mockResolvedValueOnce([
          { action_key: 'STORAGE_CREATE', tier: 'FREE', enabled: false },
        ]);
        // Query 4: tierRows
        mockQuery.mockResolvedValueOnce([
          { tier: 'FREE', tier_order: 0 },
          { tier: 'STARTER', tier_order: 1 },
          { tier: 'GROWTH', tier_order: 2 },
          { tier: 'ENTERPRISE', tier_order: 3 },
        ]);

        const result = await adapter.getActionTierRequirements();

        expect(result['STORAGE_CREATE']).toBe('STARTER');
      });
    });

    describe('When getActionTierRequirements is called a second time', () => {
      it('Then it returns the cached result without making any DB queries', async () => {
        // First call — 4 queries
        mockQuery.mockResolvedValueOnce([]);
        mockQuery.mockResolvedValueOnce([{ key: 'PRODUCT_READ' }]);
        mockQuery.mockResolvedValueOnce([]);
        mockQuery.mockResolvedValueOnce([{ tier: 'FREE', tier_order: 0 }]);

        const first = await adapter.getActionTierRequirements();

        mockQuery.mockClear();

        const second = await adapter.getActionTierRequirements();

        expect(mockQuery).not.toHaveBeenCalled();
        expect(second).toBe(first);
      });
    });
  });

  // ── getTierNumericLimits ──────────────────────────────────────────────────

  describe('Given the adapter needs numeric limits for a tier', () => {
    describe('When the tier exists in the DB', () => {
      it('Then it returns the mapped limits using the correct field names', async () => {
        mockQuery.mockResolvedValueOnce([
          { max_products: 1000, max_users: 5, max_warehouses: 3 },
        ]);

        const result = await adapter.getTierNumericLimits('STARTER');

        expect(result['storageCount']).toBe(3);
        expect(result['memberCount']).toBe(5);
        expect(result['productCount']).toBe(1000);
      });
    });

    describe('When the tier does NOT exist in the DB', () => {
      it('Then it returns the fallback defaults: storageCount=0, memberCount=1, productCount=100', async () => {
        mockQuery.mockResolvedValueOnce([]);

        const result = await adapter.getTierNumericLimits('UNKNOWN_TIER');

        expect(result['storageCount']).toBe(0);
        expect(result['memberCount']).toBe(1);
        expect(result['productCount']).toBe(100);
      });
    });

    describe('When max_warehouses is null in the DB row', () => {
      it('Then storageCount defaults to 0 via nullish coalescing', async () => {
        mockQuery.mockResolvedValueOnce([
          { max_products: 100, max_users: 1, max_warehouses: null },
        ]);

        const result = await adapter.getTierNumericLimits('FREE');

        expect(result['storageCount']).toBe(0);
      });
    });

    describe('When getTierNumericLimits is called a second time for the same tier', () => {
      it('Then it returns the cached result without querying the DB again', async () => {
        mockQuery.mockResolvedValueOnce([
          { max_products: 100, max_users: 1, max_warehouses: 0 },
        ]);

        const first = await adapter.getTierNumericLimits('FREE');

        mockQuery.mockClear();

        const second = await adapter.getTierNumericLimits('FREE');

        expect(mockQuery).not.toHaveBeenCalled();
        expect(second).toBe(first);
      });
    });
  });

  // ── getTierOrder ──────────────────────────────────────────────────────────

  describe('Given the adapter needs the tier ordering', () => {
    describe('When getTierOrder is called', () => {
      it('Then it returns a Record mapping tier name to tier_order number', async () => {
        mockQuery.mockResolvedValueOnce([
          { tier: 'FREE', tier_order: 0 },
          { tier: 'STARTER', tier_order: 1 },
          { tier: 'GROWTH', tier_order: 2 },
          { tier: 'ENTERPRISE', tier_order: 3 },
        ]);

        const result = await adapter.getTierOrder();

        expect(result['FREE']).toBe(0);
        expect(result['STARTER']).toBe(1);
        expect(result['GROWTH']).toBe(2);
        expect(result['ENTERPRISE']).toBe(3);
      });
    });

    describe('When getTierOrder is called a second time', () => {
      it('Then it returns the cached result without querying the DB again', async () => {
        mockQuery.mockResolvedValueOnce([
          { tier: 'FREE', tier_order: 0 },
          { tier: 'STARTER', tier_order: 1 },
        ]);

        const first = await adapter.getTierOrder();

        mockQuery.mockClear();

        const second = await adapter.getTierOrder();

        expect(mockQuery).not.toHaveBeenCalled();
        expect(second).toBe(first);
      });
    });
  });

  // ── getActionLimitChecks ──────────────────────────────────────────────────

  describe('Given the adapter provides the action-to-limit-key mapping', () => {
    describe('When getActionLimitChecks is called', () => {
      it('Then it returns exactly the hardcoded mapping for STORAGE_CREATE, MEMBER_INVITE, and PRODUCT_CREATE', async () => {
        const result = await adapter.getActionLimitChecks();

        expect(result).toEqual({
          STORAGE_CREATE: 'storageCount',
          MEMBER_INVITE: 'memberCount',
          PRODUCT_CREATE: 'productCount',
        });
      });
    });

    describe('When getActionLimitChecks is called multiple times', () => {
      it('Then it returns the same mapping on every call without any DB queries', async () => {
        const first = await adapter.getActionLimitChecks();
        const second = await adapter.getActionLimitChecks();

        expect(mockQuery).not.toHaveBeenCalled();
        expect(second).toEqual(first);
      });
    });
  });

  // ── getAssignableRoles ────────────────────────────────────────────────────

  describe('Given a role that has no delegation rules defined', () => {
    describe('When getAssignableRoles is called', () => {
      it('Then it returns an empty array', async () => {
        mockQuery.mockResolvedValueOnce([]);

        const result = await adapter.getAssignableRoles('VIEWER');

        expect(result).toEqual([]);
      });
    });
  });

  describe('Given a role that has delegation rules in the DB', () => {
    describe('When getAssignableRoles is called', () => {
      it('Then it returns an array of target_role_key strings', async () => {
        mockQuery.mockResolvedValueOnce([
          { target_role_key: 'MANAGER' },
          { target_role_key: 'BUYER' },
        ]);

        const result = await adapter.getAssignableRoles('OWNER');

        expect(result).toEqual(['MANAGER', 'BUYER']);
        expect(mockQuery).toHaveBeenCalledWith(
          `SELECT target_role_key FROM authz.role_delegation_rules WHERE inviter_role_key = $1`,
          ['OWNER'],
        );
      });
    });

    describe('When getAssignableRoles is called a second time for the same role', () => {
      it('Then it returns the cached result without querying the DB again', async () => {
        mockQuery.mockResolvedValueOnce([{ target_role_key: 'MANAGER' }]);

        const first = await adapter.getAssignableRoles('PARTNER');

        mockQuery.mockClear();

        const second = await adapter.getAssignableRoles('PARTNER');

        expect(mockQuery).not.toHaveBeenCalled();
        expect(second).toEqual(first);
      });
    });
  });

  // ── getUserGrants ─────────────────────────────────────────────────────────

  describe('Given a user with no active permission grants in the tenant', () => {
    describe('When getUserGrants is called', () => {
      it('Then it returns an empty array', async () => {
        mockQuery.mockResolvedValueOnce([]);

        const result = await adapter.getUserGrants(1, 42);

        expect(result).toEqual([]);
        expect(mockQuery).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Given a user with active permission grants in the tenant', () => {
    describe('When getUserGrants is called', () => {
      it('Then it returns the list of action_key strings for non-revoked grants', async () => {
        mockQuery.mockResolvedValueOnce([
          { action_key: 'PRODUCT_DELETE' },
          { action_key: 'REPORT_ADVANCED' },
        ]);

        const result = await adapter.getUserGrants(5, 99);

        expect(result).toEqual(['PRODUCT_DELETE', 'REPORT_ADVANCED']);
        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('authz.user_permission_grants'),
          [5, 99],
        );
      });
    });

    describe('When getUserGrants is called multiple times for the same user', () => {
      it('Then it always queries the DB with no caching applied', async () => {
        mockQuery.mockResolvedValue([{ action_key: 'PRODUCT_READ' }]);

        await adapter.getUserGrants(1, 10);
        await adapter.getUserGrants(1, 10);
        await adapter.getUserGrants(1, 10);

        expect(mockQuery).toHaveBeenCalledTimes(3);
      });
    });
  });
});

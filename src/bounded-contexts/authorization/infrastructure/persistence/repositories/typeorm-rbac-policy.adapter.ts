import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { IRbacPolicyPort } from '@authorization/domain/contracts/rbac-policy.port';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

@Injectable()
export class TypeOrmRbacPolicyAdapter implements IRbacPolicyPort {
  private readonly cache = new Map<string, CacheEntry<unknown>>();

  private static readonly TTL_SHORT = 10 * 60 * 1000; // 10 min
  private static readonly TTL_LONG = 30 * 60 * 1000; // 30 min

  constructor(private readonly dataSource: DataSource) {}

  async getRoleActions(roleKey: string): Promise<ReadonlySet<string>> {
    const cacheKey = `role-actions:${roleKey}`;
    const cached = this.getFromCache<ReadonlySet<string>>(cacheKey);
    if (cached) return cached;

    const rows: Array<{ action_key: string }> = await this.dataSource.query(
      `SELECT action_key FROM authz.role_action_grants WHERE role_key = $1`,
      [roleKey],
    );

    const result: ReadonlySet<string> = new Set(rows.map((r) => r.action_key));
    this.setCache(cacheKey, result, TypeOrmRbacPolicyAdapter.TTL_SHORT);
    return result;
  }

  async getActionTierRequirements(): Promise<Readonly<Record<string, string>>> {
    const cacheKey = 'tier-requirements';
    const cached = this.getFromCache<Readonly<Record<string, string>>>(cacheKey);
    if (cached) return cached;

    // Derive tier requirements from tier_action_overrides: actions disabled at lower tiers
    const allActions: Array<{ key: string }> = await this.dataSource.query(
      `SELECT key FROM capabilities.catalog_actions WHERE is_active = true`,
    );

    const overrides: Array<{ action_key: string; tier: string; enabled: boolean }> = await this
      .dataSource.query(`
        SELECT ca.key as action_key, tao.tier, tao.enabled
        FROM tiers.tier_action_overrides tao
        JOIN capabilities.catalog_actions ca ON ca.id = tao.action_id
      `);

    const tierOrder: Record<string, number> = {};
    const tierRows: Array<{ tier: string; tier_order: number }> = await this.dataSource.query(
      `SELECT tier, tier_order FROM tiers.tier_plans WHERE tier_order IS NOT NULL ORDER BY tier_order`,
    );
    for (const row of tierRows) {
      tierOrder[row.tier] = row.tier_order;
    }

    const tiers = tierRows.map((r) => r.tier);
    const result: Record<string, string> = {};

    for (const action of allActions) {
      const actionOverrides = overrides.filter((o) => o.action_key === action.key);

      if (actionOverrides.length === 0) {
        result[action.key] = 'FREE';
        continue;
      }

      // Find the lowest tier where action is enabled
      let minTier = 'FREE';
      for (const tier of tiers) {
        const override = actionOverrides.find((o) => o.tier === tier);
        if (!override || override.enabled) {
          minTier = tier;
          break;
        }
        /* istanbul ignore next */
        minTier = tiers[tiers.indexOf(tier) + 1] ?? 'ENTERPRISE';
      }

      result[action.key] = minTier;
    }

    this.setCache(cacheKey, result, TypeOrmRbacPolicyAdapter.TTL_LONG);
    return result;
  }

  async getTierNumericLimits(tier: string): Promise<Readonly<Record<string, number>>> {
    const cacheKey = `tier-limits:${tier}`;
    const cached = this.getFromCache<Readonly<Record<string, number>>>(cacheKey);
    if (cached) return cached;

    const rows: Array<{
      max_products: number | null;
      max_users: number | null;
      max_warehouses: number | null;
    }> = await this.dataSource.query(
      `SELECT max_products, max_users, max_warehouses FROM tiers.tier_plans WHERE tier = $1`,
      [tier],
    );

    /* istanbul ignore next */
    if (rows.length === 0) {
      return { storageCount: 0, memberCount: 1, productCount: 100 };
    }

    const row = rows[0];
    const result: Record<string, number> = {
      storageCount: row.max_warehouses ?? 0,
      memberCount: row.max_users ?? 1,
      productCount: row.max_products ?? 100,
    };

    this.setCache(cacheKey, result, TypeOrmRbacPolicyAdapter.TTL_LONG);
    return result;
  }

  async getTierOrder(): Promise<Readonly<Record<string, number>>> {
    const cacheKey = 'tier-order';
    const cached = this.getFromCache<Readonly<Record<string, number>>>(cacheKey);
    if (cached) return cached;

    const rows: Array<{ tier: string; tier_order: number }> = await this.dataSource.query(
      `SELECT tier, tier_order FROM tiers.tier_plans WHERE tier_order IS NOT NULL ORDER BY tier_order`,
    );

    const result: Record<string, number> = {};
    for (const row of rows) {
      result[row.tier] = row.tier_order;
    }

    this.setCache(cacheKey, result, TypeOrmRbacPolicyAdapter.TTL_LONG);
    return result;
  }

  getActionLimitChecks(): Promise<Readonly<Record<string, string>>> {
    // These are structural and unlikely to change — mapped by action semantics
    // STORAGE_CREATE → storageCount, MEMBER_INVITE → memberCount, PRODUCT_CREATE → productCount
    return Promise.resolve({
      STORAGE_CREATE: 'storageCount',
      MEMBER_INVITE: 'memberCount',
      PRODUCT_CREATE: 'productCount',
    });
  }

  async getAssignableRoles(roleKey: string): Promise<readonly string[]> {
    const cacheKey = `assignable:${roleKey}`;
    const cached = this.getFromCache<readonly string[]>(cacheKey);
    if (cached) return cached;

    const rows: Array<{ target_role_key: string }> = await this.dataSource.query(
      `SELECT target_role_key FROM authz.role_delegation_rules WHERE inviter_role_key = $1`,
      [roleKey],
    );

    const result = rows.map((r) => r.target_role_key);
    this.setCache(cacheKey, result, TypeOrmRbacPolicyAdapter.TTL_SHORT);
    return result;
  }

  async getUserGrants(tenantId: number, userId: number): Promise<readonly string[]> {
    const rows: Array<{ action_key: string }> = await this.dataSource.query(
      `SELECT action_key FROM authz.user_permission_grants
       WHERE tenant_id = $1 AND user_id = $2 AND revoked_at IS NULL`,
      [tenantId, userId],
    );

    return rows.map((r) => r.action_key);
  }

  // ── Cache helpers ──────────────────────────────────────────────────────────

  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;
    /* istanbul ignore next */
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  private setCache<T>(key: string, data: T, ttl: number): void {
    this.cache.set(key, { data, expiresAt: Date.now() + ttl });
  }
}

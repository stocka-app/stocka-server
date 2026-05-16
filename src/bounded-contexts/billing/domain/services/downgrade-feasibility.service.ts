import { TierPlanModel } from '@tenant/domain/models/tier-plan.model';
import { TierVO } from '@tenant/domain/value-objects/tier.vo';

/**
 * Current usage counters for a tenant, keyed by module. Populated by the
 * handler (which queries each module's repo) before invoking the service.
 * Values are non-negative integers.
 */
export interface TenantUsage {
  warehouses: number;
  storeRooms: number;
  customRooms: number;
  members: number;
  products: number;
}

export type FeasibilityModule = 'warehouse' | 'storeRoom' | 'customRoom' | 'member' | 'product';

/**
 * One blocker per module that exceeds the target tier's limit. The handler
 * surfaces these to the user (FE shows which entities are over-quota) and
 * the domain raises `DowngradeBlockedByUsageException` carrying this array.
 */
export interface FeasibilityBlocker {
  module: FeasibilityModule;
  current: number;
  max: number;
  excess: number;
}

export type FeasibilityResult =
  | { allowed: true }
  | { allowed: false; blockers: FeasibilityBlocker[] };

export interface FeasibilityInput {
  currentUsage: TenantUsage;
  targetTier: TierVO;
  targetTierLimits: TierPlanModel;
}

/**
 * Pure domain service that decides whether a tenant can be downgraded to a
 * target tier based on whether its current usage fits the new limits.
 *
 * Operates on pre-loaded domain values (no repository dependency, no I/O)
 * — the handler queries each module's count + the target tier's plan
 * before invoking `evaluate`. Returning a structured `FeasibilityResult`
 * keeps the policy reusable across:
 *
 *   - Pre-flight checks in `downgrade()` handlers (block the request)
 *   - UI previews in Fase 7 (show users what would be archived)
 *   - Admin tooling for ENTERPRISE → paid tier conversion
 *
 * The `TierPlanModel` from Tenant BC uses two conventions for "unlimited":
 *   - `null` for maxProducts / maxUsers / maxWarehouses
 *   - `-1`   for maxCustomRooms / maxStoreRooms
 *
 * Both are treated the same here (no blocker emitted).
 */
export class DowngradeFeasibilityService {
  static evaluate(input: FeasibilityInput): FeasibilityResult {
    const blockers: FeasibilityBlocker[] = [];

    const checkNullableLimit = (
      module: FeasibilityModule,
      current: number,
      max: number | null,
    ): void => {
      if (max === null) return;
      if (current > max) {
        blockers.push({ module, current, max, excess: current - max });
      }
    };

    const checkSentinelLimit = (module: FeasibilityModule, current: number, max: number): void => {
      if (max === -1) return;
      if (current > max) {
        blockers.push({ module, current, max, excess: current - max });
      }
    };

    checkNullableLimit(
      'warehouse',
      input.currentUsage.warehouses,
      input.targetTierLimits.maxWarehouses,
    );
    checkSentinelLimit(
      'storeRoom',
      input.currentUsage.storeRooms,
      input.targetTierLimits.maxStoreRooms,
    );
    checkSentinelLimit(
      'customRoom',
      input.currentUsage.customRooms,
      input.targetTierLimits.maxCustomRooms,
    );
    checkNullableLimit('member', input.currentUsage.members, input.targetTierLimits.maxUsers);
    checkNullableLimit('product', input.currentUsage.products, input.targetTierLimits.maxProducts);

    if (blockers.length === 0) return { allowed: true };
    return { allowed: false, blockers };
  }
}

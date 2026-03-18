import { Injectable } from '@nestjs/common';
import { ok, err, Result } from '@shared/domain/result';
import { PolicyContext, UsageCounts } from '@shared/domain/policy/policy-context';
import {
  FeatureNotInTierError,
  ActionNotAllowedError,
  TierLimitReachedError,
  PolicyViolationError,
} from '@shared/domain/policy/policy-errors';
import {
  ACTION_TIER_REQUIREMENTS,
  ROLE_ALLOWED_ACTIONS,
  ACTION_LIMIT_CHECKS,
  TIER_NUMERIC_LIMITS,
  TIER_ORDER,
} from '@shared/domain/policy/tier-policy.config';

@Injectable()
export class CapabilityResolver {
  canPerformAction(context: PolicyContext): Result<void, PolicyViolationError> {
    const tierResult = this.checkTierFeature(context);
    if (tierResult.isErr()) return tierResult;

    const roleResult = this.checkRolePermission(context);
    if (roleResult.isErr()) return roleResult;

    if (context.usageCounts) {
      const limitResult = this.checkUsageLimit(context, context.usageCounts);
      if (limitResult.isErr()) return limitResult;
    }

    return ok(undefined);
  }

  private checkTierFeature(context: PolicyContext): Result<void, FeatureNotInTierError> {
    const requiredTier = ACTION_TIER_REQUIREMENTS[context.action];
    const tierSatisfied = TIER_ORDER[context.tenantTier] >= TIER_ORDER[requiredTier];

    if (!tierSatisfied) {
      return err(new FeatureNotInTierError(context.action, context.tenantTier, requiredTier));
    }

    return ok(undefined);
  }

  private checkRolePermission(context: PolicyContext): Result<void, ActionNotAllowedError> {
    const allowedActions = ROLE_ALLOWED_ACTIONS[context.userRole];
    if (!allowedActions.has(context.action)) {
      return err(new ActionNotAllowedError(context.action, context.userRole));
    }

    return ok(undefined);
  }

  private checkUsageLimit(
    context: PolicyContext,
    usageCounts: Partial<UsageCounts>,
  ): Result<void, TierLimitReachedError> {
    const limitKey = ACTION_LIMIT_CHECKS[context.action];
    if (!limitKey) return ok(undefined);

    const current = usageCounts[limitKey];
    if (current === undefined) return ok(undefined);

    const limit = TIER_NUMERIC_LIMITS[context.tenantTier][limitKey];
    if (limit === -1) return ok(undefined); // unlimited

    if (current >= limit) {
      return err(new TierLimitReachedError(limitKey, context.tenantTier, limit, current));
    }

    return ok(undefined);
  }
}

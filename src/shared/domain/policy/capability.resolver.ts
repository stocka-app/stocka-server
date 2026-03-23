import { Inject, Injectable } from '@nestjs/common';
import { ok, err, Result } from '@shared/domain/result';
import { PolicyContext, UsageCounts } from '@shared/domain/policy/policy-context';
import {
  FeatureNotInTierError,
  ActionNotAllowedError,
  TierLimitReachedError,
  PolicyViolationError,
} from '@shared/domain/policy/policy-errors';
import { CapabilitySnapshot } from '@shared/domain/policy/capability-snapshot';
import { IRbacPolicyPort } from '@shared/domain/policy/rbac-policy.port';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

@Injectable()
export class CapabilityResolver {
  constructor(
    @Inject(INJECTION_TOKENS.RBAC_POLICY_PORT)
    private readonly rbacPort: IRbacPolicyPort,
  ) {}

  async canPerformAction(context: PolicyContext): Promise<Result<void, PolicyViolationError>> {
    const tierResult = await this.checkTierFeature(context);
    if (tierResult.isErr()) return tierResult;

    const roleResult = await this.checkRolePermission(context);
    if (roleResult.isErr()) return roleResult;

    if (context.usageCounts) {
      const limitResult = await this.checkUsageLimit(context, context.usageCounts);
      if (limitResult.isErr()) return limitResult;
    }

    return ok(undefined);
  }

  async canPerformActionWithSnapshot(
    context: PolicyContext,
    snapshot: CapabilitySnapshot,
  ): Promise<Result<void, PolicyViolationError>> {
    const capability = snapshot[context.action];
    if (!capability.enabled) {
      const tierRequirements = await this.rbacPort.getActionTierRequirements();
      const requiredTier = tierRequirements[context.action] ?? 'FREE';
      return err(
        new FeatureNotInTierError(
          context.action,
          context.tenantTier,
          requiredTier as typeof context.tenantTier,
        ),
      );
    }

    const roleResult = await this.checkRolePermission(context);
    if (roleResult.isErr()) return roleResult;

    if (context.usageCounts) {
      const limitResult = await this.checkUsageLimit(context, context.usageCounts);
      if (limitResult.isErr()) return limitResult;
    }

    return ok(undefined);
  }

  private async checkTierFeature(
    context: PolicyContext,
  ): Promise<Result<void, FeatureNotInTierError>> {
    const [tierRequirements, tierOrder] = await Promise.all([
      this.rbacPort.getActionTierRequirements(),
      this.rbacPort.getTierOrder(),
    ]);

    const requiredTier = tierRequirements[context.action] ?? 'FREE';
    const currentOrder = tierOrder[context.tenantTier] ?? 0;
    const requiredOrder = tierOrder[requiredTier] ?? 0;

    if (currentOrder < requiredOrder) {
      return err(
        new FeatureNotInTierError(
          context.action,
          context.tenantTier,
          requiredTier as typeof context.tenantTier,
        ),
      );
    }

    return ok(undefined);
  }

  private async checkRolePermission(
    context: PolicyContext,
  ): Promise<Result<void, ActionNotAllowedError>> {
    const allowedActions = await this.rbacPort.getRoleActions(context.userRole);
    if (!allowedActions.has(context.action)) {
      return err(new ActionNotAllowedError(context.action, context.userRole));
    }

    return ok(undefined);
  }

  private async checkUsageLimit(
    context: PolicyContext,
    usageCounts: Partial<UsageCounts>,
  ): Promise<Result<void, TierLimitReachedError>> {
    const actionLimitChecks = await this.rbacPort.getActionLimitChecks();
    const limitKey = actionLimitChecks[context.action];
    if (!limitKey) return ok(undefined);

    const current = usageCounts[limitKey as keyof UsageCounts];
    if (current === undefined) return ok(undefined);

    const tierLimits = await this.rbacPort.getTierNumericLimits(context.tenantTier);
    const limit = tierLimits[limitKey] ?? 0;
    if (limit === -1) return ok(undefined); // unlimited

    if (current >= limit) {
      return err(new TierLimitReachedError(limitKey, context.tenantTier, limit, current));
    }

    return ok(undefined);
  }
}

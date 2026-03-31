import { BusinessLogicException } from '@shared/domain/exceptions/business-logic.exception';
import { TierEnum } from '@authorization/domain/enums/tier.enum';
import { MemberRoleEnum } from '@authorization/domain/enums/member-role.enum';
import { SystemAction } from '@authorization/domain/enums/actions-catalog';

export class FeatureNotInTierError extends BusinessLogicException {
  constructor(action: SystemAction, tier: TierEnum, requiredTier: TierEnum) {
    super(
      `Action '${action}' requires tier ${requiredTier} or higher, but tenant is on ${tier}`,
      'FEATURE_NOT_IN_TIER',
      [{ field: 'tier', message: `Requires ${requiredTier} or higher` }],
      { action, currentTier: tier, requiredTier },
    );
  }
}

export class ActionNotAllowedError extends BusinessLogicException {
  constructor(action: SystemAction, role: MemberRoleEnum) {
    super(
      `Role '${role}' is not allowed to perform action '${action}'`,
      'ACTION_NOT_ALLOWED',
      [{ field: 'role', message: `Role ${role} cannot perform this action` }],
      { action, role },
    );
  }
}

export class TierLimitReachedError extends BusinessLogicException {
  constructor(limitKey: string, tier: TierEnum, limit: number, current: number) {
    super(
      `Tier limit reached: ${limitKey} is at ${current}/${limit} for tier ${tier}`,
      'TIER_LIMIT_REACHED',
      [{ field: limitKey, message: `Limit of ${limit} reached` }],
      { limitKey, tier, limit, current },
    );
  }
}

export type PolicyViolationError =
  | FeatureNotInTierError
  | ActionNotAllowedError
  | TierLimitReachedError;

import { BusinessLogicException } from '@shared/domain/exceptions/business-logic.exception';

export class InvalidTierTransitionException extends BusinessLogicException {
  constructor(fromTier: string, toTier: string, reason: string) {
    super(
      `Invalid tier transition from ${fromTier} to ${toTier}: ${reason}`,
      'INVALID_TIER_TRANSITION',
      [{ field: 'targetTier', message: reason }],
    );
  }
}

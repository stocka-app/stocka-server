import { BusinessLogicException } from '@shared/domain/exceptions/business-logic.exception';

export class SameTierChangeException extends BusinessLogicException {
  constructor(tier: string) {
    super(`Cannot change to the same tier (${tier})`, 'SAME_TIER_CHANGE', [
      { field: 'tier', message: `Already on tier ${tier}` },
    ]);
  }
}

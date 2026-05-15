import { BusinessLogicException } from '@shared/domain/exceptions/business-logic.exception';

export class SameTierDirectionException extends BusinessLogicException {
  constructor(tier: string) {
    super(`Cannot derive direction: from and to tiers are equal (${tier})`, 'SAME_TIER_DIRECTION', [
      { field: 'tier', message: `From and to tiers are equal: ${tier}` },
    ]);
  }
}

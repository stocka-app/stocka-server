import { BusinessLogicException } from '@shared/domain/exceptions/business-logic.exception';

export class InvalidBillingModeForTierException extends BusinessLogicException {
  constructor(tier: string, billingMode: string) {
    super(
      `Billing mode ${billingMode} is not valid for tier ${tier}`,
      'INVALID_BILLING_MODE_FOR_TIER',
      [
        {
          field: 'billingMode',
          message: `Combination (${tier}, ${billingMode}) violates the (tier × billingMode) matrix`,
        },
      ],
    );
  }
}

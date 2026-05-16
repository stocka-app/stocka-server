import { BusinessLogicException } from '@shared/domain/exceptions/business-logic.exception';

export class SubscriptionNotAssignableToEnterpriseException extends BusinessLogicException {
  constructor(subscriptionUUID: string, reason: string) {
    super(
      `Subscription ${subscriptionUUID} cannot be assigned ENTERPRISE plan: ${reason}`,
      'SUBSCRIPTION_NOT_ASSIGNABLE_TO_ENTERPRISE',
      [{ field: 'subscription', message: reason }],
    );
  }
}

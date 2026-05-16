import { BusinessLogicException } from '@shared/domain/exceptions/business-logic.exception';

export class SubscriptionNotActiveException extends BusinessLogicException {
  constructor(subscriptionUUID: string, currentStatus: string) {
    super(
      `Subscription ${subscriptionUUID} is not active (current status: ${currentStatus})`,
      'SUBSCRIPTION_NOT_ACTIVE',
      [{ field: 'status', message: `Operation requires ACTIVE status, found ${currentStatus}` }],
    );
  }
}

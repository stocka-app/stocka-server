import { BusinessLogicException } from '@shared/domain/exceptions/business-logic.exception';

export class SubscriptionNotFoundException extends BusinessLogicException {
  constructor(identifier: string) {
    super(`Subscription not found: ${identifier}`, 'SUBSCRIPTION_NOT_FOUND', [
      { field: 'identifier', message: `No subscription matches ${identifier}` },
    ]);
  }
}

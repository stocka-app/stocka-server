import { BusinessLogicException } from '@shared/domain/exceptions/business-logic.exception';

export class CannotReactivateException extends BusinessLogicException {
  constructor(subscriptionUUID: string) {
    super(
      `Subscription ${subscriptionUUID} cannot be reactivated: no pending cancellation`,
      'CANNOT_REACTIVATE',
      [
        {
          field: 'cancelAtPeriodEnd',
          message: 'Reactivate is only valid when cancelAtPeriodEnd is true',
        },
      ],
    );
  }
}

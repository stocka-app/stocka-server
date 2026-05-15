import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class InvalidStripeIdsException extends DomainException {
  constructor(reason: string) {
    super(`Invalid StripeIds: ${reason}`, 'INVALID_STRIPE_IDS', [
      { field: 'stripeIds', message: reason },
    ]);
  }
}

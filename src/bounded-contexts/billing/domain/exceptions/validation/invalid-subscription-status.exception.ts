import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class InvalidSubscriptionStatusException extends DomainException {
  constructor(value: string) {
    super(`Invalid subscription status: ${value}`, 'INVALID_SUBSCRIPTION_STATUS', [
      { field: 'status', message: `Invalid subscription status: ${value}` },
    ]);
  }
}

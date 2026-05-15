import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class InvalidSubscriptionEventTypeException extends DomainException {
  constructor(value: string) {
    super(`Invalid subscription event type: ${value}`, 'INVALID_SUBSCRIPTION_EVENT_TYPE', [
      { field: 'eventType', message: `Invalid subscription event type: ${value}` },
    ]);
  }
}

import { DomainEvent } from '@shared/domain/base/domain-event';

export class PaymentFailedEvent extends DomainEvent {
  constructor(
    public readonly subscriptionUUID: string,
    public readonly tenantUUID: string,
    public readonly attemptCount: number,
    public readonly nextRetryAt: Date | null,
  ) {
    super();
  }
}

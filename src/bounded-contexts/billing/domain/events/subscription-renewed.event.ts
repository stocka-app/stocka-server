import { DomainEvent } from '@shared/domain/base/domain-event';

export class SubscriptionRenewedEvent extends DomainEvent {
  constructor(
    public readonly subscriptionUUID: string,
    public readonly tenantUUID: string,
    public readonly periodStart: Date,
    public readonly periodEnd: Date,
  ) {
    super();
  }
}

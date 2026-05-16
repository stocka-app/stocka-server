import { DomainEvent } from '@shared/domain/base/domain-event';

export class SubscriptionCancelledEvent extends DomainEvent {
  constructor(
    public readonly subscriptionUUID: string,
    public readonly tenantUUID: string,
    public readonly previousTier: string,
    public readonly actorUUID: string,
  ) {
    super();
  }
}

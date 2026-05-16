import { DomainEvent } from '@shared/domain/base/domain-event';

export class SubscriptionResetToFreeEvent extends DomainEvent {
  constructor(
    public readonly subscriptionUUID: string,
    public readonly tenantUUID: string,
    public readonly previousTier: string,
    public readonly previousBillingMode: string,
    public readonly reason: string,
    public readonly actorUUID: string,
  ) {
    super();
  }
}

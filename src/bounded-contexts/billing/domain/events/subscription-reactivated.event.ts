import { DomainEvent } from '@shared/domain/base/domain-event';

export class SubscriptionReactivatedEvent extends DomainEvent {
  constructor(
    public readonly subscriptionUUID: string,
    public readonly tenantUUID: string,
    public readonly actorUUID: string,
  ) {
    super();
  }
}

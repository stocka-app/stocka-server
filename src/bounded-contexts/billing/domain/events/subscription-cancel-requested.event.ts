import { DomainEvent } from '@shared/domain/base/domain-event';

export class SubscriptionCancelRequestedEvent extends DomainEvent {
  constructor(
    public readonly subscriptionUUID: string,
    public readonly tenantUUID: string,
    public readonly cancelAtPeriodEnd: boolean,
    public readonly effectiveAt: Date | null,
    public readonly actorUUID: string,
  ) {
    super();
  }
}

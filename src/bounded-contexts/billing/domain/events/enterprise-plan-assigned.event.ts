import { DomainEvent } from '@shared/domain/base/domain-event';

export class EnterprisePlanAssignedEvent extends DomainEvent {
  constructor(
    public readonly subscriptionUUID: string,
    public readonly tenantUUID: string,
    public readonly pricingPlanId: number,
    public readonly billingMode: string,
    public readonly periodStart: Date,
    public readonly periodEnd: Date,
    public readonly actorUUID: string,
  ) {
    super();
  }
}

import { DomainEvent } from '@shared/domain/base/domain-event';

export interface UpgradeCommittedStripeIds {
  customerId: string;
  subscriptionId: string;
  priceId: string | null;
}

export class UpgradeCommittedEvent extends DomainEvent {
  constructor(
    public readonly subscriptionUUID: string,
    public readonly tenantUUID: string,
    public readonly tier: string,
    public readonly pricingPlanId: number,
    public readonly stripeIds: UpgradeCommittedStripeIds,
    public readonly periodStart: Date,
    public readonly periodEnd: Date,
  ) {
    super();
  }
}

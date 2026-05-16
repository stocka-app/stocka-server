import { DomainEvent } from '@shared/domain/base/domain-event';

export class UpgradeRequestedEvent extends DomainEvent {
  constructor(
    public readonly subscriptionUUID: string,
    public readonly tenantUUID: string,
    public readonly fromTier: string,
    public readonly toTier: string,
    public readonly targetPricingPlanId: number,
    public readonly actorUUID: string,
  ) {
    super();
  }
}

import { DomainEvent } from '@shared/domain/base/domain-event';

export class TierChangeCreatedEvent extends DomainEvent {
  constructor(
    public readonly tierChangeUUID: string,
    public readonly subscriptionId: number,
    public readonly fromPricingPlanId: number | null,
    public readonly toPricingPlanId: number,
    public readonly direction: string,
    public readonly source: string,
    public readonly initialState: string,
  ) {
    super();
  }
}

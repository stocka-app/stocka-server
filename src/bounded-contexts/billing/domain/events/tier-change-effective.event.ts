import { DomainEvent } from '@shared/domain/base/domain-event';

export class TierChangeEffectiveEvent extends DomainEvent {
  constructor(
    public readonly tierChangeUUID: string,
    public readonly subscriptionId: number,
    public readonly effectiveAt: Date,
  ) {
    super();
  }
}

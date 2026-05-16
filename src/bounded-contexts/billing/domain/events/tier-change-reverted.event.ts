import { DomainEvent } from '@shared/domain/base/domain-event';

export class TierChangeRevertedEvent extends DomainEvent {
  constructor(
    public readonly tierChangeUUID: string,
    public readonly subscriptionId: number,
    public readonly previousState: string,
    public readonly reason: string,
  ) {
    super();
  }
}

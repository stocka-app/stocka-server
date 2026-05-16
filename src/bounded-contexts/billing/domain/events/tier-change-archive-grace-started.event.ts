import { DomainEvent } from '@shared/domain/base/domain-event';

export class TierChangeArchiveGraceStartedEvent extends DomainEvent {
  constructor(
    public readonly tierChangeUUID: string,
    public readonly subscriptionId: number,
    public readonly graceEndsAt: Date,
  ) {
    super();
  }
}

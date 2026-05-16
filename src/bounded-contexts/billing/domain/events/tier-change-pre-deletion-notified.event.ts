import { DomainEvent } from '@shared/domain/base/domain-event';

export class TierChangePreDeletionNotifiedEvent extends DomainEvent {
  constructor(
    public readonly tierChangeUUID: string,
    public readonly subscriptionId: number,
    public readonly scheduledDeleteAt: Date,
  ) {
    super();
  }
}

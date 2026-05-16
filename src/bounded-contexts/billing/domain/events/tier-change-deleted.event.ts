import { DomainEvent } from '@shared/domain/base/domain-event';

export class TierChangeDeletedEvent extends DomainEvent {
  constructor(
    public readonly tierChangeUUID: string,
    public readonly subscriptionId: number,
    public readonly deletedSnapshot: Record<string, unknown>,
  ) {
    super();
  }
}

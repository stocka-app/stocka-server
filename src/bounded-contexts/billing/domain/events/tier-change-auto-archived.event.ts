import { DomainEvent } from '@shared/domain/base/domain-event';

export class TierChangeAutoArchivedEvent extends DomainEvent {
  constructor(
    public readonly tierChangeUUID: string,
    public readonly subscriptionId: number,
    public readonly snapshot: Record<string, unknown>,
  ) {
    super();
  }
}

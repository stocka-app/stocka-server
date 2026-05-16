import { DomainEvent } from '@shared/domain/base/domain-event';

export class PendingDowngradeRevertedEvent extends DomainEvent {
  constructor(
    public readonly subscriptionUUID: string,
    public readonly tenantUUID: string,
    public readonly tierChangeUUID: string,
    public readonly reason: string,
    public readonly actorUUID: string,
  ) {
    super();
  }
}

import { DomainEvent } from '@shared/domain/base/domain-event';

export class DowngradeRequestedEvent extends DomainEvent {
  constructor(
    public readonly subscriptionUUID: string,
    public readonly tenantUUID: string,
    public readonly fromTier: string,
    public readonly toTier: string,
    public readonly tierChangeUUID: string,
    public readonly coldDownEndsAt: Date,
    public readonly actorUUID: string,
  ) {
    super();
  }
}

import { DomainEvent } from '@shared/domain/base/domain-event';

export class DunningDowngradeExecutedEvent extends DomainEvent {
  constructor(
    public readonly subscriptionUUID: string,
    public readonly tenantUUID: string,
    public readonly previousTier: string,
    public readonly tierChangeUUID: string,
  ) {
    super();
  }
}

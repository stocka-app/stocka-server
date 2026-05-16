import { DomainEvent } from '@shared/domain/base/domain-event';

export class DowngradeAppliedEvent extends DomainEvent {
  constructor(
    public readonly subscriptionUUID: string,
    public readonly tenantUUID: string,
    public readonly tier: string,
    public readonly tierChangeUUID: string,
  ) {
    super();
  }
}

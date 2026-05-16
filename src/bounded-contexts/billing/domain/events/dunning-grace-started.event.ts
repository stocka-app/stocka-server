import { DomainEvent } from '@shared/domain/base/domain-event';

export class DunningGraceStartedEvent extends DomainEvent {
  constructor(
    public readonly subscriptionUUID: string,
    public readonly tenantUUID: string,
    public readonly graceEndsAt: Date,
  ) {
    super();
  }
}

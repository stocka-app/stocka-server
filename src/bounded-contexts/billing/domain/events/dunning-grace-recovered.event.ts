import { DomainEvent } from '@shared/domain/base/domain-event';

export class DunningGraceRecoveredEvent extends DomainEvent {
  constructor(
    public readonly subscriptionUUID: string,
    public readonly tenantUUID: string,
  ) {
    super();
  }
}

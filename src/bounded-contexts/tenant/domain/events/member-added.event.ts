import { DomainEvent } from '@shared/domain/base/domain-event';

export class MemberAddedEvent extends DomainEvent {
  constructor(
    public readonly tenantUUID: string,
    public readonly userUUID: string,
    public readonly role: string,
  ) {
    super();
  }
}

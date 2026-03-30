import { DomainEvent } from '@shared/domain/base/domain-event';

export class SessionCreatedEvent extends DomainEvent {
  constructor(
    public readonly sessionUUID: string,
    public readonly accountId: number,
  ) {
    super();
  }
}

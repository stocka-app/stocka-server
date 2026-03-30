import { DomainEvent } from '@shared/domain/base/domain-event';

export class SessionRefreshedEvent extends DomainEvent {
  constructor(
    public readonly oldSessionUUID: string,
    public readonly newSessionUUID: string,
  ) {
    super();
  }
}

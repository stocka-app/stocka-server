import { DomainEvent } from '@shared/domain/base/domain-event';

export class SessionArchivedEvent extends DomainEvent {
  constructor(public readonly sessionUUID: string) {
    super();
  }
}

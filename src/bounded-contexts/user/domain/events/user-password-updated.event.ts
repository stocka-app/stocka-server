import { DomainEvent } from '@shared/domain/base/domain-event';

export class UserPasswordUpdatedEvent extends DomainEvent {
  constructor(public readonly userUUID: string) {
    super();
  }
}

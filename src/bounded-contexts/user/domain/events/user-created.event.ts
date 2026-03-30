import { DomainEvent } from '@shared/domain/base/domain-event';

export class UserCreatedEvent extends DomainEvent {
  constructor(
    public readonly userUUID: string,
    public readonly email: string,
    public readonly username: string,
  ) {
    super();
  }
}

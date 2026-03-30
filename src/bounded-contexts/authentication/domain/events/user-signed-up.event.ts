import { DomainEvent } from '@shared/domain/base/domain-event';

export class UserSignedUpEvent extends DomainEvent {
  constructor(
    public readonly userUUID: string,
    public readonly email: string,
  ) {
    super();
  }
}

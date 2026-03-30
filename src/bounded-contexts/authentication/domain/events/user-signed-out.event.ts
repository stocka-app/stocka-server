import { DomainEvent } from '@shared/domain/base/domain-event';

export class UserSignedOutEvent extends DomainEvent {
  constructor(public readonly userUUID: string) {
    super();
  }
}

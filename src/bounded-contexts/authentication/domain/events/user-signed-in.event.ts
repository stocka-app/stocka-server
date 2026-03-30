import { DomainEvent } from '@shared/domain/base/domain-event';

export class UserSignedInEvent extends DomainEvent {
  constructor(public readonly userUUID: string) {
    super();
  }
}

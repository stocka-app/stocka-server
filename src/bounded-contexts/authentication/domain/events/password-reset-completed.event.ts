import { DomainEvent } from '@shared/domain/base/domain-event';

export class PasswordResetCompletedEvent extends DomainEvent {
  constructor(public readonly credentialAccountId: number) {
    super();
  }
}

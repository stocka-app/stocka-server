import { DomainEvent } from '@shared/domain/base/domain-event';

export class EmailVerificationFailedEvent extends DomainEvent {
  constructor(
    public readonly userUUID: string,
    public readonly email: string,
    public readonly ipAddress: string,
    public readonly failedAttempts: number,
  ) {
    super();
  }
}

import { DomainEvent } from '@shared/domain/base/domain-event';

export class UserVerificationBlockedEvent extends DomainEvent {
  constructor(
    public readonly userUUID: string,
    public readonly email: string,
    public readonly blockedUntil: Date,
    public readonly reason: 'too_many_attempts' | 'rate_limit_exceeded',
  ) {
    super();
  }
}

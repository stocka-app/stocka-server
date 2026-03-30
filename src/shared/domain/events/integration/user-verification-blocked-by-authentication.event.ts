import { DomainEvent } from '@shared/domain/base/domain-event';

/**
 * Integration event: Auth BC → User BC.
 * Published by Auth BC when rate limiting blocks a user's verification attempts.
 * User BC reacts by setting the verification block on the user.
 */
export class UserVerificationBlockedByAuthenticationEvent extends DomainEvent {
  constructor(
    public readonly userUUID: string,
    public readonly blockedUntil: Date,
  ) {
    super();
  }
}

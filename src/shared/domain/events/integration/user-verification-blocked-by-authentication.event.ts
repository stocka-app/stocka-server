import { IEvent } from '@nestjs/cqrs';

/**
 * Integration event: Auth BC → User BC.
 * Published by Auth BC when rate limiting blocks a user's verification attempts.
 * User BC reacts by setting the verification block on the user.
 */
export class UserVerificationBlockedByAuthenticationEvent implements IEvent {
  constructor(
    public readonly userUUID: string,
    public readonly blockedUntil: Date,
    public readonly occurredOn: Date = new Date(),
  ) {}
}

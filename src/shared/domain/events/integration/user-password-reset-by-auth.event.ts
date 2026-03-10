import { IEvent } from '@nestjs/cqrs';

/**
 * Integration event: Auth BC → User BC.
 * Published by Auth BC after a password reset is completed.
 * User BC reacts by updating the user's password hash.
 */
export class UserPasswordResetByAuthEvent implements IEvent {
  constructor(
    public readonly userId: number,
    public readonly newPasswordHash: string,
    public readonly occurredOn: Date = new Date(),
  ) {}
}

import { DomainEvent } from '@shared/domain/base/domain-event';

/**
 * Integration event: Auth BC → User BC.
 * Published by Auth BC after a password reset is completed.
 * User BC reacts by updating the user's password hash.
 */
export class UserPasswordResetByAuthenticationEvent extends DomainEvent {
  constructor(
    public readonly credentialAccountId: number,
    public readonly newPasswordHash: string,
  ) {
    super();
  }
}

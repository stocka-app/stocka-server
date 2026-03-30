import { UserPasswordResetByAuthenticationEvent } from '@shared/domain/events/integration/user-password-reset-by-authentication.event';
import { UserVerificationBlockedByAuthenticationEvent } from '@shared/domain/events/integration/user-verification-blocked-by-authentication.event';

describe('Integration events', () => {
  describe('Given UserPasswordResetByAuthenticationEvent', () => {
    describe('When constructed with required fields', () => {
      it('Then it holds credentialAccountId, newPasswordHash, and occurredOn from DomainEvent', () => {
        const event = new UserPasswordResetByAuthenticationEvent(1, 'bcrypt-hash');
        expect(event.credentialAccountId).toBe(1);
        expect(event.newPasswordHash).toBe('bcrypt-hash');
        expect(event.occurredOn).toBeInstanceOf(Date);
        expect(event.eventName).toBe('UserPasswordResetByAuthenticationEvent');
      });
    });
  });

  describe('Given UserVerificationBlockedByAuthenticationEvent', () => {
    describe('When constructed with required fields', () => {
      it('Then it holds userUUID, blockedUntil, and occurredOn from DomainEvent', () => {
        const blockedUntil = new Date(Date.now() + 10 * 60 * 1000);
        const event = new UserVerificationBlockedByAuthenticationEvent('user-uuid', blockedUntil);
        expect(event.userUUID).toBe('user-uuid');
        expect(event.blockedUntil).toBe(blockedUntil);
        expect(event.occurredOn).toBeInstanceOf(Date);
        expect(event.eventName).toBe('UserVerificationBlockedByAuthenticationEvent');
      });
    });
  });
});

import { UserPasswordResetByAuthenticationEvent } from '@shared/domain/events/integration/user-password-reset-by-authentication.event';
import { UserVerificationBlockedByAuthenticationEvent } from '@shared/domain/events/integration/user-verification-blocked-by-authentication.event';

describe('Integration events', () => {
  describe('Given UserPasswordResetByAuthenticationEvent', () => {
    describe('When constructed with required fields', () => {
      it('Then it holds userId, newPasswordHash, and a default occurredOn', () => {
        const event = new UserPasswordResetByAuthenticationEvent(1, 'bcrypt-hash');
        expect(event.userId).toBe(1);
        expect(event.newPasswordHash).toBe('bcrypt-hash');
        expect(event.occurredOn).toBeInstanceOf(Date);
      });
    });

    describe('When constructed with an explicit date', () => {
      it('Then it uses the provided date', () => {
        const date = new Date('2024-01-15');
        const event = new UserPasswordResetByAuthenticationEvent(2, 'hash', date);
        expect(event.occurredOn).toBe(date);
      });
    });
  });

  describe('Given UserVerificationBlockedByAuthenticationEvent', () => {
    describe('When constructed with required fields', () => {
      it('Then it holds userUUID, blockedUntil, and a default occurredOn', () => {
        const blockedUntil = new Date(Date.now() + 10 * 60 * 1000);
        const event = new UserVerificationBlockedByAuthenticationEvent('user-uuid', blockedUntil);
        expect(event.userUUID).toBe('user-uuid');
        expect(event.blockedUntil).toBe(blockedUntil);
        expect(event.occurredOn).toBeInstanceOf(Date);
      });
    });

    describe('When constructed with an explicit occurredOn', () => {
      it('Then it uses the provided date', () => {
        const date = new Date('2024-03-10');
        const event = new UserVerificationBlockedByAuthenticationEvent(
          'uuid',
          new Date(),
          date,
        );
        expect(event.occurredOn).toBe(date);
      });
    });
  });
});

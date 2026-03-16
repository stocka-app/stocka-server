import { EmailVerificationFailedEvent } from '@authentication/domain/events/email-verification-failed.event';
import { SessionArchivedEvent } from '@authentication/domain/events/session-archived.event';
import { SessionRefreshedEvent } from '@authentication/domain/events/session-refreshed.event';
import { UserSignedOutEvent } from '@authentication/domain/events/user-signed-out.event';
import { UserVerificationBlockedEvent } from '@authentication/domain/events/user-verification-blocked.event';
import { EmailVerificationCompletedEvent } from '@authentication/domain/events/email-verification-completed.event';
import { PasswordResetRequestedEvent } from '@authentication/domain/events/password-reset-requested.event';
import { VerificationCodeResentEvent } from '@authentication/domain/events/verification-code-resent.event';

describe('Authentication domain events', () => {
  describe('Given EmailVerificationFailedEvent', () => {
    describe('When constructed with required fields', () => {
      it('Then it holds all properties correctly', () => {
        const event = new EmailVerificationFailedEvent(
          'uuid-123',
          'test@example.com',
          '192.168.1.1',
          3,
        );
        expect(event.userUUID).toBe('uuid-123');
        expect(event.email).toBe('test@example.com');
        expect(event.ipAddress).toBe('192.168.1.1');
        expect(event.failedAttempts).toBe(3);
        expect(event.occurredOn).toBeInstanceOf(Date);
      });
    });

    describe('When constructed with a custom occurredOn date', () => {
      it('Then it uses the provided date', () => {
        const date = new Date('2024-01-01T00:00:00Z');
        const event = new EmailVerificationFailedEvent('uuid', 'e@e.com', '1.1.1.1', 1, date);
        expect(event.occurredOn).toBe(date);
      });
    });
  });

  describe('Given SessionArchivedEvent', () => {
    describe('When constructed with a session UUID', () => {
      it('Then it holds the UUID and a default occurredOn', () => {
        const event = new SessionArchivedEvent('session-uuid-abc');
        expect(event.sessionUUID).toBe('session-uuid-abc');
        expect(event.occurredOn).toBeInstanceOf(Date);
      });
    });

    describe('When constructed with an explicit date', () => {
      it('Then it uses the provided date', () => {
        const date = new Date('2024-06-01');
        const event = new SessionArchivedEvent('session-uuid', date);
        expect(event.occurredOn).toBe(date);
      });
    });
  });

  describe('Given SessionRefreshedEvent', () => {
    describe('When constructed with old and new session UUIDs', () => {
      it('Then it holds both UUIDs and a default occurredOn', () => {
        const event = new SessionRefreshedEvent('old-uuid', 'new-uuid');
        expect(event.oldSessionUUID).toBe('old-uuid');
        expect(event.newSessionUUID).toBe('new-uuid');
        expect(event.occurredOn).toBeInstanceOf(Date);
      });
    });

    describe('When constructed with an explicit date', () => {
      it('Then it uses the provided date', () => {
        const date = new Date('2024-06-15');
        const event = new SessionRefreshedEvent('old', 'new', date);
        expect(event.occurredOn).toBe(date);
      });
    });
  });

  describe('Given UserSignedOutEvent', () => {
    describe('When constructed with a user UUID', () => {
      it('Then it holds the UUID and a default occurredOn', () => {
        const event = new UserSignedOutEvent('user-uuid-xyz');
        expect(event.userUUID).toBe('user-uuid-xyz');
        expect(event.occurredOn).toBeInstanceOf(Date);
      });
    });

    describe('When constructed with an explicit date', () => {
      it('Then it uses the provided date', () => {
        const date = new Date('2024-03-01');
        const event = new UserSignedOutEvent('uuid', date);
        expect(event.occurredOn).toBe(date);
      });
    });
  });

  describe('Given UserVerificationBlockedEvent', () => {
    describe('When constructed with all required fields', () => {
      it('Then it holds all properties including the reason', () => {
        const blockedUntil = new Date(Date.now() + 10 * 60 * 1000);
        const event = new UserVerificationBlockedEvent(
          'user-uuid',
          'user@example.com',
          blockedUntil,
          'too_many_attempts',
        );
        expect(event.userUUID).toBe('user-uuid');
        expect(event.email).toBe('user@example.com');
        expect(event.blockedUntil).toBe(blockedUntil);
        expect(event.reason).toBe('too_many_attempts');
        expect(event.occurredOn).toBeInstanceOf(Date);
      });
    });

    describe('When the reason is rate_limit_exceeded', () => {
      it('Then it stores the correct reason', () => {
        const event = new UserVerificationBlockedEvent(
          'uuid',
          'e@e.com',
          new Date(),
          'rate_limit_exceeded',
        );
        expect(event.reason).toBe('rate_limit_exceeded');
      });
    });
  });

  describe('Given EmailVerificationCompletedEvent', () => {
    describe('When constructed without an explicit lang', () => {
      it('Then it defaults to es and creates a valid event', () => {
        const event = new EmailVerificationCompletedEvent('uuid-completed', 'done@test.com');
        expect(event.userUUID).toBe('uuid-completed');
        expect(event.email).toBe('done@test.com');
        expect(event.lang).toBe('es');
        expect(event.occurredOn).toBeInstanceOf(Date);
      });
    });

    describe('When constructed with lang en', () => {
      it('Then it stores lang en', () => {
        const event = new EmailVerificationCompletedEvent('uuid', 'e@e.com', 'en');
        expect(event.lang).toBe('en');
      });
    });
  });

  describe('Given PasswordResetRequestedEvent', () => {
    describe('When constructed with required fields only', () => {
      it('Then it defaults lang to es, isSocialAccount to false, and provider to null', () => {
        const event = new PasswordResetRequestedEvent(1, 'user@test.com', 'reset-token');
        expect(event.credentialAccountId).toBe(1);
        expect(event.email).toBe('user@test.com');
        expect(event.token).toBe('reset-token');
        expect(event.lang).toBe('es');
        expect(event.isSocialAccount).toBe(false);
        expect(event.provider).toBeNull();
        expect(event.occurredOn).toBeInstanceOf(Date);
      });
    });

    describe('When constructed with social account flags', () => {
      it('Then it stores isSocialAccount and provider correctly', () => {
        const event = new PasswordResetRequestedEvent(
          2,
          'social@test.com',
          'token-abc',
          'en',
          true,
          'google',
        );
        expect(event.isSocialAccount).toBe(true);
        expect(event.provider).toBe('google');
        expect(event.lang).toBe('en');
      });
    });
  });

  describe('Given VerificationCodeResentEvent', () => {
    describe('When constructed without explicit lang', () => {
      it('Then it defaults to es', () => {
        const event = new VerificationCodeResentEvent(42, 'user@test.com', 'ABC123', 2);
        expect(event.credentialAccountId).toBe(42);
        expect(event.email).toBe('user@test.com');
        expect(event.code).toBe('ABC123');
        expect(event.resendCount).toBe(2);
        expect(event.lang).toBe('es');
        expect(event.occurredOn).toBeInstanceOf(Date);
      });
    });

    describe('When constructed with lang en', () => {
      it('Then it stores lang en', () => {
        const event = new VerificationCodeResentEvent(1, 'e@e.com', 'XYZ789', 1, 'en');
        expect(event.lang).toBe('en');
      });
    });
  });
});

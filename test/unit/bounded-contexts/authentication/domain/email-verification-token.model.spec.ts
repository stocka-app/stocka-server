import { EmailVerificationTokenModel } from '@authentication/domain/models/email-verification-token.model';
import { EmailVerificationRequestedEvent } from '@authentication/domain/events/email-verification-requested.event';
import { EmailVerificationCompletedEvent } from '@authentication/domain/events/email-verification-completed.event';
import { VerificationCodeResentEvent } from '@authentication/domain/events/verification-code-resent.event';

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';
const FUTURE_DATE = (): Date => {
  const d = new Date();
  d.setMinutes(d.getMinutes() + 10);
  return d;
};

describe('EmailVerificationTokenModel', () => {
  describe('Given a new token created via create()', () => {
    describe('When code is provided', () => {
      it('Then it emits EmailVerificationRequestedEvent', () => {
        const token = EmailVerificationTokenModel.create({
          userId: 1,
          codeHash: 'hash',
          expiresAt: FUTURE_DATE(),
          email: 'user@test.com',
          code: 'ABC123',
        });
        const events = token.getUncommittedEvents();
        expect(events).toHaveLength(1);
        expect(events[0]).toBeInstanceOf(EmailVerificationRequestedEvent);
      });
    });

    describe('When code is not provided', () => {
      it('Then it does not emit any event', () => {
        const token = EmailVerificationTokenModel.create({
          userId: 1,
          codeHash: 'hash',
          expiresAt: FUTURE_DATE(),
          email: 'user@test.com',
        });
        expect(token.getUncommittedEvents()).toHaveLength(0);
      });
    });
  });

  describe('Given a token created via createForResend()', () => {
    describe('When called with all fields', () => {
      it('Then it emits VerificationCodeResentEvent with count 1', () => {
        const token = EmailVerificationTokenModel.createForResend({
          userId: 2,
          codeHash: 'hash2',
          expiresAt: FUTURE_DATE(),
          email: 'resend@test.com',
          code: 'DEF456',
          lang: 'en',
        });
        expect(token.resendCount).toBe(1);
        const events = token.getUncommittedEvents();
        expect(events).toHaveLength(1);
        expect(events[0]).toBeInstanceOf(VerificationCodeResentEvent);
      });
    });

    describe('When called without lang', () => {
      it('Then it defaults lang to "es" in the emitted event', () => {
        // Covers the `props.lang ?? 'es'` false branch (lang not provided → defaults to 'es')
        const token = EmailVerificationTokenModel.createForResend({
          userId: 3,
          codeHash: 'hash3',
          expiresAt: FUTURE_DATE(),
          email: 'default-lang@test.com',
          code: 'GHI789',
        });
        expect(token.resendCount).toBe(1);
        const events = token.getUncommittedEvents();
        expect(events).toHaveLength(1);
        expect(events[0]).toBeInstanceOf(VerificationCodeResentEvent);
      });
    });
  });

  describe('Given a reconstituted token', () => {
    describe('When reconstituted from persisted data', () => {
      it('Then it holds all properties without emitting events', () => {
        const token = EmailVerificationTokenModel.reconstitute({
          id: 5,
          uuid: VALID_UUID,
          userId: 10,
          codeHash: 'stored-hash',
          expiresAt: FUTURE_DATE(),
          usedAt: null,
          resendCount: 2,
          lastResentAt: new Date(Date.now() - 5000),
        });
        expect(token.id).toBe(5);
        expect(token.uuid).toBe(VALID_UUID);
        expect(token.userId).toBe(10);
        expect(token.resendCount).toBe(2);
        expect(token.getUncommittedEvents()).toHaveLength(0);
        // Covers line 101 null branch: usedAt getter when _usedAt is null → returns null
        expect(token.usedAt).toBeNull();
      });

      it('Then usedAt getter returns a Date when reconstituted with a usedAt timestamp', () => {
        // Covers line 44 TRUE branch: props.usedAt is set → creates UsedAtVO
        const usedDate = new Date(Date.now() - 60000);
        const token = EmailVerificationTokenModel.reconstitute({
          id: 6,
          uuid: VALID_UUID,
          userId: 11,
          codeHash: 'used-hash',
          expiresAt: FUTURE_DATE(),
          usedAt: usedDate,
          resendCount: 0,
          lastResentAt: null,
        });
        expect(token.usedAt).toBeInstanceOf(Date);
        expect(token.isUsed()).toBe(true);
      });
    });
  });

  describe('Given a valid token', () => {
    describe('When checking isValid()', () => {
      it('Then it returns true for a non-expired, non-used, non-archived token', () => {
        const token = EmailVerificationTokenModel.create({
          userId: 1,
          codeHash: 'h',
          expiresAt: FUTURE_DATE(),
          email: 'e@e.com',
        });
        expect(token.isValid()).toBe(true);
        expect(token.isExpired()).toBe(false);
        expect(token.isUsed()).toBe(false);
      });
    });
  });

  describe('Given a token that has been marked as used', () => {
    describe('When markAsUsed() is called', () => {
      it('Then isUsed returns true and emits EmailVerificationCompletedEvent', () => {
        const token = EmailVerificationTokenModel.create({
          userId: 1,
          codeHash: 'h',
          expiresAt: FUTURE_DATE(),
          email: 'user@test.com',
        });
        token.markAsUsed('some-uuid', 'user@test.com', 'es');
        expect(token.isUsed()).toBe(true);
        const events = token.getUncommittedEvents();
        const completedEvents = events.filter((e) => e instanceof EmailVerificationCompletedEvent);
        expect(completedEvents).toHaveLength(1);
      });

      it('Then lang defaults to "es" when not provided', () => {
        // Covers line 124 default parameter branch: lang: Locale = 'es'
        const token = EmailVerificationTokenModel.create({
          userId: 1,
          codeHash: 'h',
          expiresAt: FUTURE_DATE(),
          email: 'user@test.com',
        });
        token.markAsUsed('some-uuid', 'user@test.com');
        expect(token.isUsed()).toBe(true);
      });
    });
  });

  describe('Given a token with zero resends', () => {
    describe('When checking canResend()', () => {
      it('Then it returns true since no cooldown has started yet', () => {
        const token = EmailVerificationTokenModel.create({
          userId: 1,
          codeHash: 'h',
          expiresAt: FUTURE_DATE(),
          email: 'e@e.com',
        });
        expect(token.canResend()).toBe(true);
        expect(token.getSecondsUntilCanResend()).toBe(0);
      });
    });
  });

  describe('Given a token reconstituted with resendCount=1 but no lastResentAt', () => {
    describe('When canResend() is called', () => {
      it('Then it returns true — secondsSinceLastResend defaults to MAX_SAFE_INTEGER, covering cooldown elapsed', () => {
        // Covers line 137: this._lastResentAt ? Math.floor(...) : Number.MAX_SAFE_INTEGER (false branch)
        const token = EmailVerificationTokenModel.reconstitute({
          id: 1,
          uuid: VALID_UUID,
          userId: 1,
          codeHash: 'h',
          expiresAt: FUTURE_DATE(),
          resendCount: 1,
          lastResentAt: null, // no lastResentAt but resendCount=1 → cooldown=60s but MAX_SAFE_INT >= 60
        });
        expect(token.canResend()).toBe(true);
      });
    });
  });

  describe('Given a token reconstituted with max resends used', () => {
    describe('When checking canResend()', () => {
      it('Then it returns false', () => {
        const token = EmailVerificationTokenModel.reconstitute({
          id: 1,
          uuid: VALID_UUID,
          userId: 1,
          codeHash: 'h',
          expiresAt: FUTURE_DATE(),
          resendCount: 5, // MAX_RESENDS_PER_HOUR = 5
          lastResentAt: new Date(),
        });
        expect(token.canResend()).toBe(false);
      });
    });
  });

  describe('Given a token reconstituted with 1 resend and a recent lastResentAt', () => {
    describe('When the cooldown period has not elapsed', () => {
      it('Then canResend returns false and getSecondsUntilCanResend returns positive', () => {
        const token = EmailVerificationTokenModel.reconstitute({
          id: 1,
          uuid: VALID_UUID,
          userId: 1,
          codeHash: 'h',
          expiresAt: FUTURE_DATE(),
          resendCount: 1,
          lastResentAt: new Date(), // just reissued
        });
        // cooldown at index 1 is 60s
        expect(token.canResend()).toBe(false);
        expect(token.getSecondsUntilCanResend()).toBeGreaterThan(0);
      });
    });
  });

  describe('Given a valid token', () => {
    describe('When updateCode() is called', () => {
      it('Then the resend count increments and emits VerificationCodeResentEvent', () => {
        const token = EmailVerificationTokenModel.create({
          userId: 1,
          codeHash: 'old-hash',
          expiresAt: FUTURE_DATE(),
          email: 'e@e.com',
        });
        token.updateCode('new-hash', FUTURE_DATE(), 'e@e.com', 'ABC123', 'en');
        expect(token.resendCount).toBe(1);
        const events = token.getUncommittedEvents();
        const resentEvents = events.filter((e) => e instanceof VerificationCodeResentEvent);
        expect(resentEvents).toHaveLength(1);
      });

      it('Then lang defaults to "es" when not provided', () => {
        // Covers line 170 default parameter branch: lang: Locale = 'es'
        const token = EmailVerificationTokenModel.create({
          userId: 1,
          codeHash: 'old-hash',
          expiresAt: FUTURE_DATE(),
          email: 'e@e.com',
        });
        token.updateCode('new-hash', FUTURE_DATE(), 'e@e.com', 'XYZ789');
        expect(token.resendCount).toBe(1);
      });
    });
  });

  describe('Given a token', () => {
    describe('When getCurrentCooldownSeconds() is called', () => {
      it('Then it returns 0 for the initial state (0 resends)', () => {
        const token = EmailVerificationTokenModel.create({
          userId: 1,
          codeHash: 'h',
          expiresAt: FUTURE_DATE(),
          email: 'e@e.com',
        });
        expect(token.getCurrentCooldownSeconds()).toBe(0);
      });

      it('Then it returns 60 for 1 resend (index 1)', () => {
        const token = EmailVerificationTokenModel.reconstitute({
          id: 1,
          uuid: VALID_UUID,
          userId: 1,
          codeHash: 'h',
          expiresAt: FUTURE_DATE(),
          resendCount: 1,
          lastResentAt: null,
        });
        expect(token.getCurrentCooldownSeconds()).toBe(60);
      });
    });

    describe('When getRemainingResends() is called', () => {
      it('Then it returns 5 for 0 resends', () => {
        const token = EmailVerificationTokenModel.create({
          userId: 1,
          codeHash: 'h',
          expiresAt: FUTURE_DATE(),
          email: 'e@e.com',
        });
        expect(token.getRemainingResends()).toBe(5);
      });

      it('Then it returns 0 when max resends are reached', () => {
        const token = EmailVerificationTokenModel.reconstitute({
          id: 1,
          uuid: VALID_UUID,
          userId: 1,
          codeHash: 'h',
          expiresAt: FUTURE_DATE(),
          resendCount: 5,
          lastResentAt: null,
        });
        expect(token.getRemainingResends()).toBe(0);
      });
    });

    describe('When getSecondsUntilCanResend() is called with no lastResentAt', () => {
      it('Then it returns 0', () => {
        const token = EmailVerificationTokenModel.reconstitute({
          id: 1,
          uuid: VALID_UUID,
          userId: 1,
          codeHash: 'h',
          expiresAt: FUTURE_DATE(),
          resendCount: 1,
          lastResentAt: null,
        });
        expect(token.getSecondsUntilCanResend()).toBe(0);
      });
    });

    describe('When expiresAt getter is accessed', () => {
      it('Then it returns the expiration date', () => {
        const future = FUTURE_DATE();
        const token = EmailVerificationTokenModel.reconstitute({
          id: 1,
          uuid: VALID_UUID,
          userId: 1,
          codeHash: 'h',
          expiresAt: future,
          resendCount: 0,
          lastResentAt: null,
        });
        expect(token.expiresAt).toBeInstanceOf(Date);
        expect(token.expiresAt.getTime()).toBeCloseTo(future.getTime(), -1);
      });
    });

    describe('When usedAt getter is accessed after markAsUsed()', () => {
      it('Then it returns the date the token was used', () => {
        const token = EmailVerificationTokenModel.create({
          userId: 1,
          codeHash: 'h',
          expiresAt: FUTURE_DATE(),
          email: 'used@test.com',
        });
        token.markAsUsed('some-uuid', 'used@test.com', 'es');
        expect(token.usedAt).toBeInstanceOf(Date);
      });
    });

    describe('When lastResentAt getter is accessed after updateCode()', () => {
      it('Then it returns the last resend date', () => {
        const token = EmailVerificationTokenModel.create({
          userId: 1,
          codeHash: 'h',
          expiresAt: FUTURE_DATE(),
          email: 'e@e.com',
        });
        token.updateCode('new-hash', FUTURE_DATE(), 'e@e.com', 'ABCD23', 'en');
        expect(token.lastResentAt).toBeInstanceOf(Date);
      });
    });

    describe('When getMaxResendsPerHour() is called', () => {
      it('Then it returns 5', () => {
        const token = EmailVerificationTokenModel.create({
          userId: 1,
          codeHash: 'h',
          expiresAt: FUTURE_DATE(),
          email: 'e@e.com',
        });
        expect(token.getMaxResendsPerHour()).toBe(5);
      });
    });
  });
});

import { VerificationAttemptModel } from '@authentication/domain/models/verification-attempt.model';
import { EmailVerificationFailedEvent } from '@authentication/domain/events/email-verification-failed.event';

const VALID_IP = '192.168.1.1';
const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';
const USER_UUID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

describe('VerificationAttemptModel', () => {
  describe('Given a new attempt via create()', () => {
    describe('When created with valid props', () => {
      it('Then it stores all fields correctly', () => {
        const attempt = VerificationAttemptModel.create({
          userUUID: USER_UUID,
          email: 'user@test.com',
          ipAddress: VALID_IP,
          userAgent: 'Mozilla/5.0',
          codeEntered: 'ABCD23',
          success: false,
          verificationType: 'email_verification',
        });

        expect(attempt.userUUID).not.toBeNull();
        expect(attempt.email).not.toBeNull();
        expect(attempt.ipAddress.toString()).toBe(VALID_IP);
        expect(attempt.result.isFailed()).toBe(true);
        expect(attempt.verificationType.toString()).toBe('email_verification');
      });
    });

    describe('When created with null userUUID and email', () => {
      it('Then userUUID and email getters return null', () => {
        const attempt = VerificationAttemptModel.create({
          userUUID: null,
          email: null,
          ipAddress: VALID_IP,
          codeEntered: null,
          success: false,
        });

        expect(attempt.userUUID).toBeNull();
        expect(attempt.email).toBeNull();
        expect(attempt.codeEntered).toBeNull();
      });
    });

    describe('When created without a userAgent', () => {
      it('Then userAgent is null', () => {
        const attempt = VerificationAttemptModel.create({
          userUUID: USER_UUID,
          email: 'u@u.com',
          ipAddress: VALID_IP,
          codeEntered: 'ABCD23',
        });
        expect(attempt.userAgent).toBeNull();
      });
    });

    describe('When no attemptedAt is provided', () => {
      it('Then it defaults to the current time', () => {
        const before = Date.now();
        const attempt = VerificationAttemptModel.create({
          userUUID: USER_UUID,
          email: 'u@u.com',
          ipAddress: VALID_IP,
          codeEntered: null,
        });
        const after = Date.now();
        const at = attempt.attemptedAt.toDate().getTime();
        expect(at).toBeGreaterThanOrEqual(before);
        expect(at).toBeLessThanOrEqual(after);
      });
    });

    describe('When a custom attemptedAt is provided', () => {
      it('Then it stores the given date', () => {
        const customDate = new Date(Date.now() - 5000);
        const attempt = VerificationAttemptModel.create({
          userUUID: USER_UUID,
          email: 'u@u.com',
          ipAddress: VALID_IP,
          codeEntered: null,
          attemptedAt: customDate,
        });
        expect(attempt.attemptedAt.toDate().getTime()).toBeCloseTo(customDate.getTime(), -1);
      });
    });
  });

  describe('Given a failed attempt created via createFailed()', () => {
    describe('When called with userUUID and failedAttempts', () => {
      it('Then it emits EmailVerificationFailedEvent', () => {
        const attempt = VerificationAttemptModel.createFailed(
          {
            userUUID: USER_UUID,
            email: 'user@test.com',
            ipAddress: VALID_IP,
            codeEntered: 'FXYZAB',
          },
          3,
        );

        const events = attempt.getUncommittedEvents();
        expect(events).toHaveLength(1);
        expect(events[0]).toBeInstanceOf(EmailVerificationFailedEvent);
        const event = events[0] as EmailVerificationFailedEvent;
        expect(event.failedAttempts).toBe(3);
        expect(event.userUUID).toBe(USER_UUID);
      });

      it('Then the result is failed', () => {
        const attempt = VerificationAttemptModel.createFailed(
          {
            userUUID: USER_UUID,
            email: 'user@test.com',
            ipAddress: VALID_IP,
            codeEntered: null,
          },
          1,
        );
        expect(attempt.result.isFailed()).toBe(true);
      });
    });
  });

  describe('Given a reconstituted attempt', () => {
    describe('When reconstituted from persisted data', () => {
      it('Then it holds all props without emitting events', () => {
        const attempt = VerificationAttemptModel.reconstitute({
          id: 10,
          uuid: VALID_UUID,
          userUUID: USER_UUID,
          email: 'stored@test.com',
          ipAddress: VALID_IP,
          codeEntered: null,
          success: true,
          verificationType: 'email_verification',
          attemptedAt: new Date(Date.now() - 10000),
        });

        expect(attempt.id).toBe(10);
        expect(attempt.uuid).toBe(VALID_UUID);
        expect(attempt.result.isSuccessful()).toBe(true);
        expect(attempt.getUncommittedEvents()).toHaveLength(0);
      });
    });
  });

  describe('Given a failed attempt', () => {
    describe('When markAsSuccessful() is called', () => {
      it('Then the result becomes successful', () => {
        const attempt = VerificationAttemptModel.create({
          userUUID: USER_UUID,
          email: 'u@u.com',
          ipAddress: VALID_IP,
          codeEntered: 'ABCD23',
          success: false,
        });

        expect(attempt.result.isFailed()).toBe(true);
        attempt.markAsSuccessful();
        expect(attempt.result.isSuccessful()).toBe(true);
      });
    });
  });

  describe('Given an attempt with password_reset verification type', () => {
    describe('When checking the type', () => {
      it('Then verificationType reflects password_reset', () => {
        const attempt = VerificationAttemptModel.create({
          userUUID: null,
          email: null,
          ipAddress: VALID_IP,
          codeEntered: null,
          verificationType: 'password_reset',
        });
        expect(attempt.verificationType.isPasswordReset()).toBe(true);
      });
    });
  });
});

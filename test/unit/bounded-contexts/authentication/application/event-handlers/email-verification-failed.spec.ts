import { EmailVerificationFailedEventHandler } from '@authentication/application/event-handlers/email-verification-failed.event-handler';
import { EmailVerificationFailedEvent } from '@authentication/domain/events/email-verification-failed.event';

describe('EmailVerificationFailedEventHandler', () => {
  let handler: EmailVerificationFailedEventHandler;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    handler = new EmailVerificationFailedEventHandler();
    // Spy on the private logger via prototype — Logger is created in constructor
    warnSpy = jest.spyOn((handler as any).logger, 'warn').mockImplementation();
  });

  describe('Given an event with failedAttempts < 5', () => {
    const event = new EmailVerificationFailedEvent(
      'user-uuid',
      'test@example.com',
      '192.168.1.1',
      3,
    );

    describe('When handle is called', () => {
      it('Then it logs only the standard warning (no suspicious activity)', () => {
        handler.handle(event);

        expect(warnSpy).toHaveBeenCalledTimes(1);
        expect(warnSpy).toHaveBeenCalledWith(
          expect.stringContaining('failedAttempts=3'),
        );
      });
    });
  });

  describe('Given an event with failedAttempts = 5', () => {
    const event = new EmailVerificationFailedEvent(
      'user-uuid',
      'test@example.com',
      '10.0.0.1',
      5,
    );

    describe('When handle is called', () => {
      it('Then it logs both the standard warning AND the suspicious activity warning', () => {
        handler.handle(event);

        expect(warnSpy).toHaveBeenCalledTimes(2);
        expect(warnSpy).toHaveBeenCalledWith(
          expect.stringContaining('Suspicious verification activity'),
        );
      });
    });
  });

  describe('Given an event with failedAttempts > 5', () => {
    const event = new EmailVerificationFailedEvent(
      'user-uuid',
      'test@example.com',
      '10.0.0.1',
      10,
    );

    describe('When handle is called', () => {
      it('Then it logs the suspicious activity warning with the correct count', () => {
        handler.handle(event);

        expect(warnSpy).toHaveBeenCalledTimes(2);
        expect(warnSpy).toHaveBeenCalledWith(
          expect.stringContaining('failedAttempts=10'),
        );
      });
    });
  });
});

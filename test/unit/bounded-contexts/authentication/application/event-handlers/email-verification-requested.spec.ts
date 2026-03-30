import { EmailVerificationRequestedEventHandler } from '@authentication/application/event-handlers/email-verification-requested.event-handler';
import { EmailVerificationRequestedEvent } from '@authentication/domain/events/email-verification-requested.event';
import { IEmailProviderContract } from '@shared/infrastructure/email/contracts/email-provider.contract';
import { withRetry } from '@shared/domain/utils/with-retry';

jest.mock('@shared/domain/utils/with-retry', () => {
  const actual = jest.requireActual<typeof import('@shared/domain/utils/with-retry')>('@shared/domain/utils/with-retry');
  return { ...actual, withRetry: jest.fn(actual.withRetry) };
});

const mockWithRetry = jest.mocked(withRetry);

/**
 * We mock timers to avoid real delays from withRetry's exponential backoff.
 * jest.useFakeTimers + advanceTimersByTimeAsync lets the retry delay resolve
 * without actually waiting 1-4 seconds per attempt.
 */

describe('EmailVerificationRequestedEventHandler', () => {
  let handler: EmailVerificationRequestedEventHandler;
  let emailProvider: jest.Mocked<Pick<IEmailProviderContract, 'sendVerificationEmail'>>;

  const event = new EmailVerificationRequestedEvent(
    1,
    'user@example.com',
    'ABC123',
    'John',
    'es',
  );

  beforeEach(() => {
    jest.useFakeTimers();
    emailProvider = {
      sendVerificationEmail: jest.fn(),
    };
    handler = new EmailVerificationRequestedEventHandler(
      emailProvider as unknown as IEmailProviderContract,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Given the email provider succeeds on the first attempt', () => {
    beforeEach(() => {
      emailProvider.sendVerificationEmail.mockResolvedValue({
        id: 'email-id-1',
        success: true,
      });
    });

    describe('When handle is called', () => {
      it('Then it sends the email and does not retry', async () => {
        await handler.handle(event);

        expect(emailProvider.sendVerificationEmail).toHaveBeenCalledTimes(1);
        expect(emailProvider.sendVerificationEmail).toHaveBeenCalledWith(
          'user@example.com',
          'ABC123',
          'John',
          'es',
        );
      });
    });
  });

  describe('Given the email provider fails on the first attempt but succeeds on the second', () => {
    beforeEach(() => {
      emailProvider.sendVerificationEmail
        .mockRejectedValueOnce(new Error('Transient SMTP error'))
        .mockResolvedValueOnce({ id: 'email-id-2', success: true });
    });

    describe('When handle is called', () => {
      it('Then it retries and succeeds on the second attempt', async () => {
        const handlePromise = handler.handle(event);

        // Advance past the 1s backoff (1000 * 2^0 = 1000ms)
        await jest.advanceTimersByTimeAsync(1100);

        await handlePromise;

        expect(emailProvider.sendVerificationEmail).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Given the email provider fails on ALL 3 attempts with Error objects', () => {
    beforeEach(() => {
      emailProvider.sendVerificationEmail
        .mockRejectedValueOnce(new Error('Attempt 1 failed'))
        .mockRejectedValueOnce(new Error('Attempt 2 failed'))
        .mockRejectedValueOnce(new Error('Attempt 3 failed'));
    });

    describe('When handle is called', () => {
      it('Then it catches the RetryExhaustedException and does not crash', async () => {
        const handlePromise = handler.handle(event);

        // Advance past backoff delays: 1000ms (attempt 1→2) + 2000ms (attempt 2→3)
        await jest.advanceTimersByTimeAsync(1100);
        await jest.advanceTimersByTimeAsync(2100);

        await expect(handlePromise).resolves.toBeUndefined();

        expect(emailProvider.sendVerificationEmail).toHaveBeenCalledTimes(3);
      });
    });
  });

  describe('Given the email provider fails with a non-Error rejection', () => {
    beforeEach(() => {
      emailProvider.sendVerificationEmail
        .mockRejectedValueOnce('string failure')
        .mockRejectedValueOnce('string failure 2')
        .mockRejectedValueOnce('string failure 3');
    });

    describe('When handle is called', () => {
      it('Then it handles non-Error rejections through the catch block', async () => {
        const handlePromise = handler.handle(event);

        await jest.advanceTimersByTimeAsync(1100);
        await jest.advanceTimersByTimeAsync(2100);

        await expect(handlePromise).resolves.toBeUndefined();

        expect(emailProvider.sendVerificationEmail).toHaveBeenCalledTimes(3);
      });
    });
  });

  describe('Given withRetry throws a non-Error value (defensive branch)', () => {
    beforeEach(() => {
      mockWithRetry.mockRejectedValue('raw string thrown');
    });

    afterEach(() => {
      mockWithRetry.mockRestore();
    });

    describe('When handle is called', () => {
      it('Then it catches the non-Error and logs it via the fallback branch', async () => {
        await expect(handler.handle(event)).resolves.toBeUndefined();
      });
    });
  });
});

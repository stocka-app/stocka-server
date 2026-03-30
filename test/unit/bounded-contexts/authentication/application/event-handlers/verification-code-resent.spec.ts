import { VerificationCodeResentEventHandler } from '@authentication/application/event-handlers/verification-code-resent.event-handler';
import { VerificationCodeResentEvent } from '@authentication/domain/events/verification-code-resent.event';
import { IEmailProviderContract } from '@shared/infrastructure/email/contracts/email-provider.contract';
import { withRetry } from '@shared/domain/utils/with-retry';

jest.mock('@shared/domain/utils/with-retry', () => {
  const actual = jest.requireActual<typeof import('@shared/domain/utils/with-retry')>(
    '@shared/domain/utils/with-retry',
  );
  return { ...actual, withRetry: jest.fn(actual.withRetry) };
});

const mockWithRetry = jest.mocked(withRetry);

describe('VerificationCodeResentEventHandler — error branch', () => {
  let handler: VerificationCodeResentEventHandler;
  let emailProvider: jest.Mocked<Pick<IEmailProviderContract, 'sendVerificationEmail'>>;

  const event = new VerificationCodeResentEvent(1, 'test@example.com', 'ABC123', 1, 'es');

  beforeEach(() => {
    emailProvider = { sendVerificationEmail: jest.fn() };
    handler = new VerificationCodeResentEventHandler(
      emailProvider as unknown as IEmailProviderContract,
    );
    jest.spyOn((handler as any).logger, 'log').mockImplementation();
    jest.spyOn((handler as any).logger, 'error').mockImplementation();
  });

  afterEach(() => {
    mockWithRetry.mockRestore();
  });

  describe('Given withRetry rejects with an Error', () => {
    beforeEach(() => {
      mockWithRetry.mockRejectedValue(new Error('All retries failed'));
    });

    describe('When handle is called', () => {
      it('Then it catches the error and does not crash', async () => {
        await expect(handler.handle(event)).resolves.toBeUndefined();
      });
    });
  });

  describe('Given withRetry rejects with a non-Error value', () => {
    beforeEach(() => {
      mockWithRetry.mockRejectedValue('raw string failure');
    });

    describe('When handle is called', () => {
      it('Then it catches the non-Error value and does not crash', async () => {
        await expect(handler.handle(event)).resolves.toBeUndefined();
      });
    });
  });
});

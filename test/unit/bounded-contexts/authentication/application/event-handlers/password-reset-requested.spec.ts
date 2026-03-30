import { PasswordResetRequestedEventHandler } from '@authentication/application/event-handlers/password-reset-requested.event-handler';
import { PasswordResetRequestedEvent } from '@authentication/domain/events/password-reset-requested.event';
import { IEmailProviderContract } from '@shared/infrastructure/email/contracts/email-provider.contract';
import { ConfigService } from '@nestjs/config';
import { withRetry } from '@shared/domain/utils/with-retry';

jest.mock('@shared/domain/utils/with-retry', () => {
  const actual = jest.requireActual<typeof import('@shared/domain/utils/with-retry')>('@shared/domain/utils/with-retry');
  return { ...actual, withRetry: jest.fn(actual.withRetry) };
});

const mockWithRetry = jest.mocked(withRetry);

describe('PasswordResetRequestedEventHandler — error branch', () => {
  let handler: PasswordResetRequestedEventHandler;
  let emailProvider: jest.Mocked<Pick<IEmailProviderContract, 'sendPasswordResetEmail'>>;
  let configService: { get: jest.Mock };

  const event = new PasswordResetRequestedEvent(1, 'test@example.com', 'token-123', 'es', false, null);

  beforeEach(() => {
    emailProvider = { sendPasswordResetEmail: jest.fn() };
    configService = { get: jest.fn().mockReturnValue('https://app.stocka.mx') };
    handler = new PasswordResetRequestedEventHandler(
      emailProvider as unknown as IEmailProviderContract,
      configService as unknown as ConfigService,
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

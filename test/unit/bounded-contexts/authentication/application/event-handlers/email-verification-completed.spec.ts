import { EmailVerificationCompletedEventHandler } from '@authentication/application/event-handlers/email-verification-completed.event-handler';
import { EmailVerificationCompletedEvent } from '@authentication/domain/events/email-verification-completed.event';
import { MediatorService } from '@shared/infrastructure/mediator/mediator.service';
import { IEmailProviderContract } from '@shared/infrastructure/email/contracts/email-provider.contract';

describe('EmailVerificationCompletedEventHandler', () => {
  let handler: EmailVerificationCompletedEventHandler;
  let mediator: { user: { findUsernameByUUID: jest.Mock } };
  let emailProvider: jest.Mocked<Pick<IEmailProviderContract, 'sendWelcomeEmail'>>;

  beforeEach(() => {
    mediator = { user: { findUsernameByUUID: jest.fn() } };
    emailProvider = { sendWelcomeEmail: jest.fn() };
    handler = new EmailVerificationCompletedEventHandler(
      mediator as unknown as MediatorService,
      emailProvider as unknown as IEmailProviderContract,
    );
    jest.spyOn((handler as any).logger, 'log').mockImplementation();
    jest.spyOn((handler as any).logger, 'error').mockImplementation();
  });

  const event = new EmailVerificationCompletedEvent('user-uuid-1', 'test@example.com', 'es');

  describe('Given the user exists and has a username', () => {
    beforeEach(() => {
      mediator.user.findUsernameByUUID.mockResolvedValue('maria_garcia');
      emailProvider.sendWelcomeEmail.mockResolvedValue({ id: 'welcome-email-1', success: true });
    });

    describe('When handle is called', () => {
      it('Then it sends a welcome email with the username and locale', async () => {
        await handler.handle(event);

        expect(mediator.user.findUsernameByUUID).toHaveBeenCalledWith('user-uuid-1');
        expect(emailProvider.sendWelcomeEmail).toHaveBeenCalledWith(
          'test@example.com',
          'maria_garcia',
          'es',
        );
      });
    });
  });

  describe('Given the user is NOT found (username is null)', () => {
    beforeEach(() => {
      mediator.user.findUsernameByUUID.mockResolvedValue(null);
    });

    describe('When handle is called', () => {
      it('Then it does not send a welcome email', async () => {
        await handler.handle(event);

        expect(emailProvider.sendWelcomeEmail).not.toHaveBeenCalled();
      });
    });
  });

  describe('Given the email provider throws an Error', () => {
    beforeEach(() => {
      mediator.user.findUsernameByUUID.mockResolvedValue('maria_garcia');
      emailProvider.sendWelcomeEmail.mockRejectedValue(new Error('SMTP timeout'));
    });

    describe('When handle is called', () => {
      it('Then it catches the error and does not crash', async () => {
        await expect(handler.handle(event)).resolves.toBeUndefined();
      });
    });
  });

  describe('Given the email provider throws a non-Error value', () => {
    beforeEach(() => {
      mediator.user.findUsernameByUUID.mockResolvedValue('maria_garcia');
      emailProvider.sendWelcomeEmail.mockRejectedValue('raw string error');
    });

    describe('When handle is called', () => {
      it('Then it catches the non-Error value and does not crash', async () => {
        await expect(handler.handle(event)).resolves.toBeUndefined();
      });
    });
  });
});

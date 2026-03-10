import { Test, TestingModule } from '@nestjs/testing';
import { CqrsModule } from '@nestjs/cqrs';
import { ConfigService } from '@nestjs/config';
import { ForgotPasswordHandler } from '@auth/application/commands/forgot-password/forgot-password.handler';
import { PasswordResetRequestedEventHandler } from '@auth/application/event-handlers/password-reset-requested.event-handler';
import { ForgotPasswordCommand } from '@auth/application/commands/forgot-password/forgot-password.command';
import { MediatorService } from '@shared/infrastructure/mediator/mediator.service';
import { IEmailProviderContract } from '@shared/infrastructure/email/contracts/email-provider.contract';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { UserMother } from '@test/helpers/object-mother/user.mother';

/** Waits for all async event handlers to finish executing */
const flushPromises = () => new Promise<void>((resolve) => setImmediate(resolve));

describe('Password recovery — transactional email delivery', () => {
  let handler: ForgotPasswordHandler;
  let emailProvider: jest.Mocked<IEmailProviderContract>;
  let mediatorService: { user: { findByEmail: jest.Mock } };

  // A real Stocka customer who already has an account
  const registeredCustomer = UserMother.create({
    id: 1,
    uuid: '550e8400-e29b-41d4-a716-446655440001',
    email: 'maria.garcia@mitienda.mx',
    username: 'maria_garcia',
  });

  // A customer who signed up exclusively via Google OAuth
  const socialOnlyCustomer = UserMother.createSocialOnly({
    id: 2,
    uuid: '550e8400-e29b-41d4-a716-446655440002',
    email: 'juan.lopez@gmail.com',
    username: 'juan_lopez',
    provider: 'google',
  });

  beforeEach(async () => {
    mediatorService = { user: { findByEmail: jest.fn() } };

    emailProvider = {
      sendEmail: jest.fn().mockResolvedValue({ success: true, id: 'email-reset-001' }),
      sendVerificationEmail: jest.fn().mockResolvedValue({ success: true, id: 'email-reset-001' }),
      sendWelcomeEmail: jest.fn().mockResolvedValue({ success: true, id: 'email-reset-001' }),
      sendPasswordResetEmail: jest.fn().mockResolvedValue({ success: true, id: 'email-reset-001' }),
    } as jest.Mocked<IEmailProviderContract>;

    const module: TestingModule = await Test.createTestingModule({
      imports: [CqrsModule],
      providers: [
        ForgotPasswordHandler,
        PasswordResetRequestedEventHandler,
        { provide: MediatorService, useValue: mediatorService },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('https://app.stocka.mx') },
        },
        {
          provide: INJECTION_TOKENS.PASSWORD_RESET_TOKEN_CONTRACT,
          useValue: { persist: jest.fn().mockResolvedValue(undefined) },
        },
        {
          provide: INJECTION_TOKENS.EMAIL_PROVIDER_CONTRACT,
          useValue: emailProvider,
        },
      ],
    }).compile();

    await module.init();
    handler = module.get(ForgotPasswordHandler);
  });

  describe('Given a Stocka customer who forgot their password and needs to recover account access', () => {
    describe('When they enter their email on the "Forgot your password?" screen', () => {
      it('Then the system sends exactly one email with the password reset link', async () => {
        // Given
        mediatorService.user.findByEmail.mockResolvedValue(registeredCustomer);

        // When
        await handler.execute(new ForgotPasswordCommand('maria.garcia@mitienda.mx', 'es'));
        await flushPromises();

        // Then
        expect(emailProvider.sendPasswordResetEmail).toHaveBeenCalledTimes(1);
      });

      it('Then the recovery email arrives in the language the customer uses in the app', async () => {
        // Given
        mediatorService.user.findByEmail.mockResolvedValue(registeredCustomer);

        // When
        await handler.execute(new ForgotPasswordCommand('maria.garcia@mitienda.mx', 'en'));
        await flushPromises();

        // Then
        expect(emailProvider.sendPasswordResetEmail).toHaveBeenCalledWith(
          'maria.garcia@mitienda.mx',
          expect.stringContaining('reset-password'),
          'maria.garcia@mitienda.mx',
          'en',
          false,
          null,
        );
      });

      it('Then no other email type is sent (no verification, no welcome) by mistake', async () => {
        // Given
        mediatorService.user.findByEmail.mockResolvedValue(registeredCustomer);

        // When
        await handler.execute(new ForgotPasswordCommand('maria.garcia@mitienda.mx', 'es'));
        await flushPromises();

        // Then
        expect(emailProvider.sendVerificationEmail).not.toHaveBeenCalled();
        expect(emailProvider.sendWelcomeEmail).not.toHaveBeenCalled();
        expect(emailProvider.sendEmail).not.toHaveBeenCalled();
      });
    });

    describe('When the email entered does not match any registered account in Stocka', () => {
      it('Then no email is sent — the system protects the privacy of registered users', async () => {
        // Given
        mediatorService.user.findByEmail.mockResolvedValue(null);

        // When
        await handler.execute(new ForgotPasswordCommand('nonexistent@domain.com', 'es'));
        await flushPromises();

        // Then
        expect(emailProvider.sendPasswordResetEmail).not.toHaveBeenCalled();
      });
    });
  });

  describe('Given a customer who signed up with Google and has never set a password', () => {
    describe('When they enter their email on the "Forgot your password?" screen', () => {
      it('Then the system sends an email with isSocialAccount=true and the provider name', async () => {
        // Given
        mediatorService.user.findByEmail.mockResolvedValue(socialOnlyCustomer);

        // When
        await handler.execute(new ForgotPasswordCommand('juan.lopez@gmail.com', 'es'));
        await flushPromises();

        // Then
        expect(emailProvider.sendPasswordResetEmail).toHaveBeenCalledWith(
          'juan.lopez@gmail.com',
          expect.stringContaining('reset-password'),
          'juan.lopez@gmail.com',
          'es',
          true,
          'google',
        );
      });

      it('Then only the informational email is sent — no other email type', async () => {
        // Given
        mediatorService.user.findByEmail.mockResolvedValue(socialOnlyCustomer);

        // When
        await handler.execute(new ForgotPasswordCommand('juan.lopez@gmail.com', 'es'));
        await flushPromises();

        // Then
        expect(emailProvider.sendPasswordResetEmail).toHaveBeenCalledTimes(1);
        expect(emailProvider.sendVerificationEmail).not.toHaveBeenCalled();
        expect(emailProvider.sendWelcomeEmail).not.toHaveBeenCalled();
      });

      it('Then the email respects the language preference of the customer', async () => {
        // Given
        mediatorService.user.findByEmail.mockResolvedValue(socialOnlyCustomer);

        // When
        await handler.execute(new ForgotPasswordCommand('juan.lopez@gmail.com', 'en'));
        await flushPromises();

        // Then
        expect(emailProvider.sendPasswordResetEmail).toHaveBeenCalledWith(
          'juan.lopez@gmail.com',
          expect.stringContaining('reset-password'),
          'juan.lopez@gmail.com',
          'en',
          true,
          'google',
        );
      });
    });
  });
});

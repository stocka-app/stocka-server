import { Test, TestingModule } from '@nestjs/testing';
import { CqrsModule } from '@nestjs/cqrs';
import { ConfigService } from '@nestjs/config';
import { ForgotPasswordHandler } from '@authentication/application/commands/forgot-password/forgot-password.handler';
import { PasswordResetRequestedEventHandler } from '@authentication/application/event-handlers/password-reset-requested.event-handler';
import { ForgotPasswordCommand } from '@authentication/application/commands/forgot-password/forgot-password.command';
import { MediatorService } from '@shared/infrastructure/mediator/mediator.service';
import { IEmailProviderContract } from '@shared/infrastructure/email/contracts/email-provider.contract';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { UserMother, CredentialAccountMother } from '@test/helpers/object-mother/user.mother';

/** Waits for all async event handlers to finish executing */
const flushPromises = (): Promise<void> => new Promise<void>((resolve) => setImmediate(resolve));

describe('Password recovery — transactional email delivery', () => {
  let handler: ForgotPasswordHandler;
  let emailProvider: jest.Mocked<IEmailProviderContract>;
  let mediatorService: { user: { findUserByEmail: jest.Mock } };

  // A real Stocka customer who already has an account
  const registeredCustomerUser = UserMother.create({
    id: 1,
    uuid: '550e8400-e29b-41d4-a716-446655440001',
  });
  const registeredCustomerCredential = CredentialAccountMother.createVerified({
    id: 1,
    email: 'maria.garcia@mitienda.mx',
  });

  // A customer who signed up exclusively via Google OAuth
  const socialCustomerUser = UserMother.create({
    id: 2,
    uuid: '550e8400-e29b-41d4-a716-446655440002',
  });
  const socialCustomerCredential = CredentialAccountMother.createSocialOnly({
    id: 2,
    email: 'juan.lopez@gmail.com',
    provider: 'google',
  });

  beforeEach(async () => {
    mediatorService = { user: { findUserByEmail: jest.fn() } };

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
          provide: INJECTION_TOKENS.CODE_GENERATOR_CONTRACT,
          useValue: {
            generateVerificationCode: jest.fn().mockReturnValue('ABC123'),
            generateSecureToken: jest.fn().mockReturnValue('a'.repeat(64)),
            hashCode: jest.fn().mockReturnValue('hashed-token'),
          },
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
        mediatorService.user.findUserByEmail.mockResolvedValue({
          user: registeredCustomerUser,
          credential: registeredCustomerCredential,
        });

        await handler.execute(new ForgotPasswordCommand('maria.garcia@mitienda.mx', 'es'));
        await flushPromises();

        expect(emailProvider.sendPasswordResetEmail).toHaveBeenCalledTimes(1);
      });

      it('Then the recovery email arrives in the language the customer uses in the app', async () => {
        mediatorService.user.findUserByEmail.mockResolvedValue({
          user: registeredCustomerUser,
          credential: registeredCustomerCredential,
        });

        await handler.execute(new ForgotPasswordCommand('maria.garcia@mitienda.mx', 'en'));
        await flushPromises();

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
        mediatorService.user.findUserByEmail.mockResolvedValue({
          user: registeredCustomerUser,
          credential: registeredCustomerCredential,
        });

        await handler.execute(new ForgotPasswordCommand('maria.garcia@mitienda.mx', 'es'));
        await flushPromises();

        expect(emailProvider.sendVerificationEmail).not.toHaveBeenCalled();
        expect(emailProvider.sendWelcomeEmail).not.toHaveBeenCalled();
        expect(emailProvider.sendEmail).not.toHaveBeenCalled();
      });
    });

    describe('When the email entered does not match any registered account in Stocka', () => {
      it('Then no email is sent — the system protects the privacy of registered users', async () => {
        mediatorService.user.findUserByEmail.mockResolvedValue(null);

        await handler.execute(new ForgotPasswordCommand('nonexistent@domain.com', 'es'));
        await flushPromises();

        expect(emailProvider.sendPasswordResetEmail).not.toHaveBeenCalled();
      });
    });
  });

  describe('Given a customer who submits the form without a locale (default language)', () => {
    describe('When no lang is provided in the command', () => {
      it('Then the command defaults to Spanish and the email is sent', async () => {
        mediatorService.user.findUserByEmail.mockResolvedValue({
          user: registeredCustomerUser,
          credential: registeredCustomerCredential,
        });

        await handler.execute(new ForgotPasswordCommand('maria.garcia@mitienda.mx'));
        await flushPromises();

        expect(emailProvider.sendPasswordResetEmail).toHaveBeenCalledWith(
          'maria.garcia@mitienda.mx',
          expect.stringContaining('reset-password'),
          'maria.garcia@mitienda.mx',
          'es',
          false,
          null,
        );
      });
    });
  });

  describe('Given a customer who signed up with Google and has never set a password', () => {
    describe('When they enter their email on the "Forgot your password?" screen', () => {
      it('Then the system sends an email with isSocialAccount=true and the provider name', async () => {
        mediatorService.user.findUserByEmail.mockResolvedValue({
          user: socialCustomerUser,
          credential: socialCustomerCredential,
        });

        await handler.execute(new ForgotPasswordCommand('juan.lopez@gmail.com', 'es'));
        await flushPromises();

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
        mediatorService.user.findUserByEmail.mockResolvedValue({
          user: socialCustomerUser,
          credential: socialCustomerCredential,
        });

        await handler.execute(new ForgotPasswordCommand('juan.lopez@gmail.com', 'es'));
        await flushPromises();

        expect(emailProvider.sendPasswordResetEmail).toHaveBeenCalledTimes(1);
        expect(emailProvider.sendVerificationEmail).not.toHaveBeenCalled();
        expect(emailProvider.sendWelcomeEmail).not.toHaveBeenCalled();
      });

      it('Then the email respects the language preference of the customer', async () => {
        mediatorService.user.findUserByEmail.mockResolvedValue({
          user: socialCustomerUser,
          credential: socialCustomerCredential,
        });

        await handler.execute(new ForgotPasswordCommand('juan.lopez@gmail.com', 'en'));
        await flushPromises();

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

import { Test, TestingModule } from '@nestjs/testing';
import { CqrsModule } from '@nestjs/cqrs';
import { ConfigService } from '@nestjs/config';
import { ResendVerificationCodeHandler } from '@auth/application/commands/resend-verification-code/resend-verification-code.handler';
import { VerificationCodeResentEventHandler } from '@auth/application/event-handlers/verification-code-resent.event-handler';
import { ResendVerificationCodeCommand } from '@auth/application/commands/resend-verification-code/resend-verification-code.command';
import { EmailVerificationTokenModel } from '@auth/domain/models/email-verification-token.model';
import { MediatorService } from '@shared/infrastructure/mediator/mediator.service';
import { IEmailProviderContract } from '@shared/infrastructure/email/contracts/email-provider.contract';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { UserMother } from '@test/helpers/object-mother/user.mother';

/** Waits for all async event handlers to finish executing */
const flushPromises = () => new Promise<void>((resolve) => setImmediate(resolve));

/**
 * Represents an active verification token in the system:
 * never used, not expired, resends still available.
 */
const buildActiveVerificationToken = (): EmailVerificationTokenModel =>
  EmailVerificationTokenModel.reconstitute({
    id: 1,
    uuid: '550e8400-e29b-41d4-a716-446655440099',
    userId: 1,
    codeHash: 'hash-active-code',
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    usedAt: null,
    resendCount: 0,
    lastResentAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    archivedAt: null,
  });

describe('Verification code resend — transactional email delivery', () => {
  let handler: ResendVerificationCodeHandler;
  let emailProvider: jest.Mocked<IEmailProviderContract>;
  let mediatorService: { findUserByEmail: jest.Mock };
  let tokenContract: { findActiveByUserId: jest.Mock; persist: jest.Mock };

  // Customer who completed registration but has not yet activated their account
  const pendingVerificationCustomer = UserMother.createPendingVerification({
    id: 1,
    email: 'carlos.mendoza@mialmacen.mx',
    username: 'carlos_mendoza',
  });

  beforeEach(async () => {
    mediatorService = {
      findUserByEmail: jest.fn().mockResolvedValue(pendingVerificationCustomer),
    };

    tokenContract = {
      findActiveByUserId: jest.fn(),
      persist: jest.fn().mockResolvedValue(undefined),
    };

    emailProvider = {
      sendEmail: jest.fn().mockResolvedValue({ success: true, id: 'email-resend-002' }),
      sendVerificationEmail: jest.fn().mockResolvedValue({ success: true, id: 'email-resend-002' }),
      sendWelcomeEmail: jest.fn().mockResolvedValue({ success: true, id: 'email-resend-002' }),
      sendPasswordResetEmail: jest
        .fn()
        .mockResolvedValue({ success: true, id: 'email-resend-002' }),
    } as jest.Mocked<IEmailProviderContract>;

    const module: TestingModule = await Test.createTestingModule({
      imports: [CqrsModule],
      providers: [
        ResendVerificationCodeHandler,
        VerificationCodeResentEventHandler,
        { provide: MediatorService, useValue: mediatorService },
        {
          provide: ConfigService,
          useValue: {
            get: jest
              .fn()
              .mockImplementation((key: string) =>
                key === 'VERIFICATION_CODE_EXPIRATION_MINUTES' ? 10 : undefined,
              ),
          },
        },
        {
          provide: INJECTION_TOKENS.EMAIL_VERIFICATION_TOKEN_CONTRACT,
          useValue: tokenContract,
        },
        {
          provide: INJECTION_TOKENS.CODE_GENERATOR_CONTRACT,
          useValue: {
            generateVerificationCode: jest.fn().mockReturnValue('NUE123'),
            hashCode: jest.fn().mockReturnValue('hash-new-code'),
          },
        },
        {
          provide: INJECTION_TOKENS.EMAIL_PROVIDER_CONTRACT,
          useValue: emailProvider,
        },
      ],
    }).compile();

    await module.init();
    handler = module.get(ResendVerificationCodeHandler);
  });

  describe('Given the customer has an active verification code and requests it to be resent', () => {
    describe('When the customer indicates they did not receive the code or need a new one', () => {
      it('Then the system sends exactly one new email with the verification code', async () => {
        // Given
        tokenContract.findActiveByUserId.mockResolvedValue(buildActiveVerificationToken());

        // When
        await handler.execute(
          new ResendVerificationCodeCommand(
            'carlos.mendoza@mialmacen.mx',
            '127.0.0.1',
            undefined,
            'es',
          ),
        );
        await flushPromises();

        // Then
        expect(emailProvider.sendVerificationEmail).toHaveBeenCalledTimes(1);
      });

      it('Then the email with the code arrives in the language the customer uses in the app', async () => {
        // Given
        tokenContract.findActiveByUserId.mockResolvedValue(buildActiveVerificationToken());

        // When
        await handler.execute(
          new ResendVerificationCodeCommand(
            'carlos.mendoza@mialmacen.mx',
            '127.0.0.1',
            undefined,
            'en',
          ),
        );
        await flushPromises();

        // Then
        expect(emailProvider.sendVerificationEmail).toHaveBeenCalledWith(
          'carlos.mendoza@mialmacen.mx',
          'NUE123',
          undefined,
          'en',
        );
      });

      it('Then no other email type is sent (no password reset, no welcome) by mistake', async () => {
        // Given
        tokenContract.findActiveByUserId.mockResolvedValue(buildActiveVerificationToken());

        // When
        await handler.execute(
          new ResendVerificationCodeCommand(
            'carlos.mendoza@mialmacen.mx',
            '127.0.0.1',
            undefined,
            'es',
          ),
        );
        await flushPromises();

        // Then
        expect(emailProvider.sendPasswordResetEmail).not.toHaveBeenCalled();
        expect(emailProvider.sendWelcomeEmail).not.toHaveBeenCalled();
        expect(emailProvider.sendEmail).not.toHaveBeenCalled();
      });
    });
  });

  describe("Given the customer's verification code has expired or was never generated", () => {
    describe('When the customer requests to activate their account and needs a new code', () => {
      it('Then the system generates a new code and sends exactly one verification email', async () => {
        // Given — no active token exists in the system
        tokenContract.findActiveByUserId.mockResolvedValue(null);

        // When
        await handler.execute(
          new ResendVerificationCodeCommand(
            'carlos.mendoza@mialmacen.mx',
            '127.0.0.1',
            undefined,
            'es',
          ),
        );
        await flushPromises();

        // Then
        expect(emailProvider.sendVerificationEmail).toHaveBeenCalledTimes(1);
      });

      it('Then that single email arrives in the language selected by the customer', async () => {
        // Given
        tokenContract.findActiveByUserId.mockResolvedValue(null);

        // When
        await handler.execute(
          new ResendVerificationCodeCommand(
            'carlos.mendoza@mialmacen.mx',
            '127.0.0.1',
            undefined,
            'en',
          ),
        );
        await flushPromises();

        // Then
        expect(emailProvider.sendVerificationEmail).toHaveBeenCalledWith(
          'carlos.mendoza@mialmacen.mx',
          'NUE123',
          undefined,
          'en',
        );
      });

      it('Then no other email type is sent by mistake', async () => {
        // Given
        tokenContract.findActiveByUserId.mockResolvedValue(null);

        // When
        await handler.execute(
          new ResendVerificationCodeCommand('carlos.mendoza@mialmacen.mx', '127.0.0.1'),
        );
        await flushPromises();

        // Then
        expect(emailProvider.sendPasswordResetEmail).not.toHaveBeenCalled();
        expect(emailProvider.sendWelcomeEmail).not.toHaveBeenCalled();
        expect(emailProvider.sendEmail).not.toHaveBeenCalled();
      });
    });
  });
});

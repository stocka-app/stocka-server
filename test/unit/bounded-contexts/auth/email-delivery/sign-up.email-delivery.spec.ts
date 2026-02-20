import { Test, TestingModule } from '@nestjs/testing';
import { CqrsModule } from '@nestjs/cqrs';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { SignUpHandler } from '@auth/application/commands/sign-up/sign-up.handler';
import { UserSignedUpEventHandler } from '@auth/application/event-handlers/user-signed-up.event-handler';
import { SessionCreatedEventHandler } from '@auth/application/event-handlers/session-created.event-handler';
import { EmailVerificationRequestedEventHandler } from '@auth/application/event-handlers/email-verification-requested.event-handler';
import { SignUpCommand } from '@auth/application/commands/sign-up/sign-up.command';
import { MediatorService } from '@shared/infrastructure/mediator/mediator.service';
import { IEmailProviderContract } from '@shared/infrastructure/email/contracts/email-provider.contract';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { UserMother } from '@test/helpers/object-mother/user.mother';

/** Waits for all async event handlers to finish executing */
const flushPromises = () => new Promise<void>((resolve) => setImmediate(resolve));

describe('New account registration — transactional email delivery', () => {
  let handler: SignUpHandler;
  let emailProvider: jest.Mocked<IEmailProviderContract>;
  let mediatorService: {
    findUserByEmail: jest.Mock;
    existsUserByUsername: jest.Mock;
    createUser: jest.Mock;
  };

  // The new customer who just discovered Stocka
  const newCustomer = UserMother.createPendingVerification({
    id: 1,
    uuid: '550e8400-e29b-41d4-a716-446655440003',
    email: 'ana.torres@ferreteria.mx',
    username: 'ana_torres',
  });

  beforeEach(async () => {
    mediatorService = {
      findUserByEmail: jest.fn().mockResolvedValue(null),
      existsUserByUsername: jest.fn().mockResolvedValue(false),
      createUser: jest.fn().mockResolvedValue(newCustomer),
    };

    emailProvider = {
      sendEmail: jest.fn().mockResolvedValue({ success: true, id: 'email-signup-003' }),
      sendVerificationEmail: jest.fn().mockResolvedValue({ success: true, id: 'email-signup-003' }),
      sendWelcomeEmail: jest.fn().mockResolvedValue({ success: true, id: 'email-signup-003' }),
      sendPasswordResetEmail: jest
        .fn()
        .mockResolvedValue({ success: true, id: 'email-signup-003' }),
    } as jest.Mocked<IEmailProviderContract>;

    const configValues: Record<string, string | number> = {
      JWT_ACCESS_SECRET: 'test-access-secret',
      JWT_REFRESH_SECRET: 'test-refresh-secret',
      JWT_ACCESS_EXPIRATION: '15m',
      JWT_REFRESH_EXPIRATION: '7d',
      VERIFICATION_CODE_EXPIRATION_MINUTES: 10,
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [CqrsModule],
      providers: [
        SignUpHandler,
        // Register all event handlers that could send email,
        // to verify that none of them fires a second send during registration
        UserSignedUpEventHandler,
        SessionCreatedEventHandler,
        EmailVerificationRequestedEventHandler,
        { provide: MediatorService, useValue: mediatorService },
        {
          provide: JwtService,
          useValue: { signAsync: jest.fn().mockResolvedValue('mock-jwt-token') },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => configValues[key]),
            getOrThrow: jest.fn().mockImplementation((key: string) => {
              if (!configValues[key]) throw new Error(`Missing config: ${key}`);
              return configValues[key];
            }),
          },
        },
        {
          provide: INJECTION_TOKENS.SESSION_CONTRACT,
          useValue: { persist: jest.fn().mockResolvedValue(undefined) },
        },
        {
          provide: INJECTION_TOKENS.EMAIL_VERIFICATION_TOKEN_CONTRACT,
          useValue: { persist: jest.fn().mockResolvedValue(undefined) },
        },
        {
          provide: INJECTION_TOKENS.CODE_GENERATOR_CONTRACT,
          useValue: {
            generateVerificationCode: jest.fn().mockReturnValue('REG456'),
            hashCode: jest.fn().mockReturnValue('hash-registration-code'),
          },
        },
        {
          provide: INJECTION_TOKENS.EMAIL_PROVIDER_CONTRACT,
          useValue: emailProvider,
        },
      ],
    }).compile();

    await module.init();
    handler = module.get(SignUpHandler);
  });

  describe('Given a new user fills out the registration form on Stocka', () => {
    describe('When they complete the form with their details and create their account', () => {
      it('Then they receive exactly one email to activate their account', async () => {
        // Given
        const command = new SignUpCommand(
          'ana.torres@ferreteria.mx',
          'ana_torres',
          'Password1!',
          'es',
        );

        // When
        await handler.execute(command);
        await flushPromises();

        // Then
        expect(emailProvider.sendVerificationEmail).toHaveBeenCalledTimes(1);
      });

      it('Then the activation email arrives in the language they selected at registration', async () => {
        // Given
        const command = new SignUpCommand(
          'ana.torres@ferreteria.mx',
          'ana_torres',
          'Password1!',
          'en',
        );

        // When
        await handler.execute(command);
        await flushPromises();

        // Then
        expect(emailProvider.sendVerificationEmail).toHaveBeenCalledWith(
          'ana.torres@ferreteria.mx',
          'REG456',
          'ana_torres',
          'en',
        );
      });

      it('Then no event handler fires a second activation email in parallel', async () => {
        /**
         * Context: SignUpHandler creates the verification token via EmailVerificationTokenModel.create()
         * which internally applies EmailVerificationRequestedEvent.
         * This test verifies that event is NEVER published (the token does not commit),
         * guaranteeing that EmailVerificationRequestedEventHandler does not send a second email.
         */
        // Given
        const command = new SignUpCommand(
          'ana.torres@ferreteria.mx',
          'ana_torres',
          'Password1!',
          'es',
        );

        // When
        await handler.execute(command);
        await flushPromises();

        // Then — exactly one, regardless of how many event handlers are active
        expect(emailProvider.sendVerificationEmail).toHaveBeenCalledTimes(1);
      });

      it('Then no other email type is sent (no password reset, no welcome) by mistake', async () => {
        // Given
        const command = new SignUpCommand(
          'ana.torres@ferreteria.mx',
          'ana_torres',
          'Password1!',
          'es',
        );

        // When
        await handler.execute(command);
        await flushPromises();

        // Then
        expect(emailProvider.sendPasswordResetEmail).not.toHaveBeenCalled();
        expect(emailProvider.sendWelcomeEmail).not.toHaveBeenCalled();
        expect(emailProvider.sendEmail).not.toHaveBeenCalled();
      });
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EventBus } from '@nestjs/cqrs';
import { CreateSessionStep } from '@authentication/application/sagas/sign-up/steps/sign-up-create-session.saga-step';
import { CreateVerificationTokenStep } from '@authentication/application/sagas/sign-up/steps/sign-up-create-verification-token.saga-step';
import { GenerateTokensStep } from '@authentication/application/sagas/sign-up/steps/sign-up-generate-tokens.saga-step';
import { PrepareCredentialsStep } from '@authentication/application/sagas/sign-up/steps/sign-up-prepare-credentials.saga-step';
import { PublishSignUpEventsStep } from '@authentication/application/sagas/sign-up/steps/sign-up-publish-events.saga-step';
import { RegisterUserStep } from '@authentication/application/sagas/sign-up/steps/sign-up-register-user.saga-step';
import { SendVerificationEmailStep } from '@authentication/application/sagas/sign-up/steps/sign-up-send-verification-email.saga-step';
import { ValidateSignUpStep } from '@authentication/application/sagas/sign-up/steps/sign-up-validate.saga-step';
import { SignUpSagaContext } from '@authentication/application/sagas/sign-up/sign-up.saga-context';
import { ISessionContract } from '@authentication/domain/contracts/session.contract';
import { IEmailVerificationTokenContract } from '@authentication/domain/contracts/email-verification-token.contract';
import { ICodeGeneratorContract } from '@shared/domain/contracts/code-generator.contract';
import { IEmailProviderContract } from '@shared/infrastructure/email/contracts/email-provider.contract';
import { EmailAlreadyExistsException } from '@authentication/domain/exceptions/email-already-exists.exception';
import { UsernameAlreadyExistsException } from '@authentication/domain/exceptions/username-already-exists.exception';
import { InvalidPasswordException } from '@authentication/domain/exceptions/invalid-password.exception';
import { UserSignedUpEvent } from '@authentication/domain/events/user-signed-up.event';
import { MediatorService } from '@shared/infrastructure/mediator/mediator.service';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { UserMother, CredentialAccountMother } from '@test/helpers/object-mother/user.mother';

const MOCK_USER = UserMother.create({
  id: 1,
  uuid: '550e8400-e29b-41d4-a716-446655440020',
});

const MOCK_CREDENTIAL = CredentialAccountMother.create({
  id: 1,
  accountId: 1,
  email: 'new@test.com',
});

// ─── ValidateSignUpStep ───────────────────────────────────────────────────────
describe('ValidateSignUpStep', () => {
  let step: ValidateSignUpStep;
  let mediator: { user: { existsByEmail: jest.Mock; existsByUsername: jest.Mock } };

  beforeEach(async () => {
    mediator = {
      user: {
        existsByEmail: jest.fn().mockResolvedValue(null),
        existsByUsername: jest.fn().mockResolvedValue(false),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ValidateSignUpStep,
        { provide: MediatorService, useValue: mediator },
      ],
    }).compile();

    step = module.get<ValidateSignUpStep>(ValidateSignUpStep);
  });

  describe('Given valid unique credentials', () => {
    describe('When execute() is called', () => {
      it('Then it completes without error', async () => {
        const ctx: SignUpSagaContext = {
          email: 'new@test.com',
          username: 'newuser',
          password: 'StrongPass1',
          lang: 'es',
        };
        await expect(step.execute(ctx)).resolves.not.toThrow();
      });
    });
  });

  describe('Given an email that already exists', () => {
    beforeEach(() => {
      mediator.user.existsByEmail.mockResolvedValue(true);
    });

    describe('When execute() is called', () => {
      it('Then it throws EmailAlreadyExistsException', async () => {
        const ctx: SignUpSagaContext = {
          email: 'existing@test.com',
          username: 'newuser',
          password: 'StrongPass1',
          lang: 'es',
        };
        await expect(step.execute(ctx)).rejects.toThrow(EmailAlreadyExistsException);
      });
    });
  });

  describe('Given a username that already exists', () => {
    beforeEach(() => {
      mediator.user.existsByUsername.mockResolvedValue(true);
    });

    describe('When execute() is called', () => {
      it('Then it throws UsernameAlreadyExistsException', async () => {
        const ctx: SignUpSagaContext = {
          email: 'unique@test.com',
          username: 'takenuser',
          password: 'StrongPass1',
          lang: 'es',
        };
        await expect(step.execute(ctx)).rejects.toThrow(UsernameAlreadyExistsException);
      });
    });
  });

  describe('Given a weak password', () => {
    describe('When execute() is called', () => {
      it('Then it throws InvalidPasswordException before checking the database', async () => {
        const ctx: SignUpSagaContext = {
          email: 'new@test.com',
          username: 'newuser',
          password: 'weak',
          lang: 'es',
        };
        await expect(step.execute(ctx)).rejects.toThrow(InvalidPasswordException);
        expect(mediator.user.existsByEmail).not.toHaveBeenCalled();
      });
    });
  });
});

// ─── PrepareCredentialsStep ───────────────────────────────────────────────────
describe('PrepareCredentialsStep', () => {
  let step: PrepareCredentialsStep;
  let codeGenerator: jest.Mocked<Pick<ICodeGeneratorContract, 'generateVerificationCode'>>;

  beforeEach(async () => {
    codeGenerator = {
      generateVerificationCode: jest.fn().mockReturnValue('ABC123'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrepareCredentialsStep,
        { provide: INJECTION_TOKENS.CODE_GENERATOR_CONTRACT, useValue: codeGenerator },
      ],
    }).compile();

    step = module.get<PrepareCredentialsStep>(PrepareCredentialsStep);
  });

  describe('Given a context with a password', () => {
    describe('When execute() is called', () => {
      it('Then it sets passwordHash and verificationCode on the context', async () => {
        const ctx: SignUpSagaContext = {
          email: 'u@t.com',
          username: 'user',
          password: 'StrongPass1',
          lang: 'es',
        };
        await step.execute(ctx);
        expect(ctx.passwordHash).toBeDefined();
        expect(ctx.passwordHash!.length).toBeGreaterThan(0);
        expect(ctx.verificationCode).toBe('ABC123');
      });
    });

    describe('When compensate() is called', () => {
      it('Then it resolves without error', async () => {
        const ctx: SignUpSagaContext = {
          email: 'u@t.com',
          username: 'user',
          password: 'StrongPass1',
          lang: 'es',
        };
        await expect(step.compensate!(ctx)).resolves.not.toThrow();
      });
    });
  });
});

// ─── RegisterUserStep ─────────────────────────────────────────────────────────
describe('RegisterUserStep', () => {
  let step: RegisterUserStep;
  let mediator: { user: { createUserWithCredentials: jest.Mock } };

  beforeEach(async () => {
    mediator = {
      user: {
        createUserWithCredentials: jest.fn().mockResolvedValue({ user: MOCK_USER, credential: MOCK_CREDENTIAL }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegisterUserStep,
        { provide: MediatorService, useValue: mediator },
      ],
    }).compile();

    step = module.get<RegisterUserStep>(RegisterUserStep);
  });

  describe('Given a context with passwordHash set', () => {
    describe('When execute() is called', () => {
      it('Then it creates the user and sets ctx.user', async () => {
        const ctx: SignUpSagaContext = {
          email: 'u@t.com',
          username: 'user',
          password: 'StrongPass1',
          lang: 'es',
          passwordHash: 'bcrypt-hash',
        };
        await step.execute(ctx);
        expect(mediator.user.createUserWithCredentials).toHaveBeenCalledWith({
          email: 'u@t.com',
          username: 'user',
          passwordHash: 'bcrypt-hash',
        });
        expect(ctx.user).toBeDefined();
      });
    });
  });

  describe('Given a context without passwordHash', () => {
    describe('When execute() is called', () => {
      it('Then it throws an invariant violation error', async () => {
        const ctx: SignUpSagaContext = {
          email: 'u@t.com',
          username: 'user',
          password: 'StrongPass1',
          lang: 'es',
        };
        await expect(step.execute(ctx)).rejects.toThrow('ctx.passwordHash not set');
      });
    });
  });

  describe('When compensate() is called', () => {
    it('Then it resolves without error', async () => {
      const ctx: SignUpSagaContext = {
        email: 'u@t.com',
        username: 'user',
        password: 'StrongPass1',
        lang: 'es',
      };
      await expect(step.compensate!(ctx)).resolves.not.toThrow();
    });
  });
});

// ─── GenerateTokensStep ───────────────────────────────────────────────────────
describe('GenerateTokensStep', () => {
  let step: GenerateTokensStep;
  let jwtService: jest.Mocked<Pick<JwtService, 'signAsync'>>;
  let configService: { get: jest.Mock; getOrThrow: jest.Mock };

  beforeEach(async () => {
    jwtService = { signAsync: jest.fn().mockResolvedValue('jwt-token') };
    configService = {
      get: jest.fn().mockImplementation((key: string) => {
        const map: Record<string, string> = {
          JWT_ACCESS_EXPIRATION: '15m',
          JWT_REFRESH_EXPIRATION: '7d',
        };
        return map[key];
      }),
      getOrThrow: jest.fn().mockReturnValue('jwt-secret'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GenerateTokensStep,
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    step = module.get<GenerateTokensStep>(GenerateTokensStep);
  });

  describe('Given a context with user set', () => {
    describe('When execute() is called', () => {
      it('Then it sets accessToken and refreshToken on the context', async () => {
        const ctx: SignUpSagaContext = {
          email: 'u@t.com',
          username: 'user',
          password: 'StrongPass1',
          lang: 'es',
          user: MOCK_USER,
          credential: MOCK_CREDENTIAL,
        };
        await step.execute(ctx);
        expect(ctx.accessToken).toBe('jwt-token');
        expect(ctx.refreshToken).toBe('jwt-token');
      });
    });
  });

  describe('Given a context without user', () => {
    describe('When execute() is called', () => {
      it('Then it throws an invariant violation error', async () => {
        const ctx: SignUpSagaContext = {
          email: 'u@t.com',
          username: 'user',
          password: 'StrongPass1',
          lang: 'es',
        };
        await expect(step.execute(ctx)).rejects.toThrow('ctx.user not set');
      });
    });
  });

  describe('Given configService returns undefined for expiration keys', () => {
    describe('When execute() is called', () => {
      it('Then it falls back to the default expiration values (15m / 7d)', async () => {
        const configWithUndefined = {
          get: jest.fn((key: string) => {
            if (key === 'JWT_ACCESS_EXPIRATION' || key === 'JWT_REFRESH_EXPIRATION')
              return undefined;
            return undefined;
          }),
          getOrThrow: jest.fn().mockReturnValue('jwt-secret'),
        };

        const newModule: TestingModule = await Test.createTestingModule({
          providers: [
            GenerateTokensStep,
            { provide: JwtService, useValue: jwtService },
            { provide: ConfigService, useValue: configWithUndefined },
          ],
        }).compile();

        const stepWithDefaults = newModule.get<GenerateTokensStep>(GenerateTokensStep);
        const ctx: SignUpSagaContext = {
          email: 'u@t.com',
          username: 'user',
          password: 'StrongPass1',
          lang: 'es',
          user: MOCK_USER,
          credential: MOCK_CREDENTIAL,
        };
        await stepWithDefaults.execute(ctx);

        expect(jwtService.signAsync).toHaveBeenCalledWith(
          expect.any(Object),
          expect.objectContaining({ expiresIn: '15m' }),
        );
      });
    });
  });
});

// ─── CreateSessionStep ────────────────────────────────────────────────────────
describe('CreateSessionStep', () => {
  let step: CreateSessionStep;
  let sessionContract: jest.Mocked<Pick<ISessionContract, 'persist'>>;

  beforeEach(async () => {
    sessionContract = {
      persist: jest.fn().mockResolvedValue({ uuid: 'session-uuid' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateSessionStep,
        { provide: INJECTION_TOKENS.SESSION_CONTRACT, useValue: sessionContract },
      ],
    }).compile();

    step = module.get<CreateSessionStep>(CreateSessionStep);
  });

  describe('Given a context with user and refreshToken', () => {
    describe('When execute() is called', () => {
      it('Then it creates and persists the session', async () => {
        const ctx: SignUpSagaContext = {
          email: 'u@t.com',
          username: 'user',
          password: 'StrongPass1',
          lang: 'es',
          user: MOCK_USER,
          credential: MOCK_CREDENTIAL,
          refreshToken: 'refresh-token',
        };
        await step.execute(ctx);
        expect(sessionContract.persist).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Given a context without user', () => {
    describe('When execute() is called', () => {
      it('Then it throws an invariant violation error', async () => {
        const ctx: SignUpSagaContext = {
          email: 'u@t.com',
          username: 'user',
          password: 'StrongPass1',
          lang: 'es',
          refreshToken: 'tok',
        };
        await expect(step.execute(ctx)).rejects.toThrow('ctx.user not set');
      });
    });
  });

  describe('Given a context without refreshToken', () => {
    describe('When execute() is called', () => {
      it('Then it throws an invariant violation error', async () => {
        const ctx: SignUpSagaContext = {
          email: 'u@t.com',
          username: 'user',
          password: 'StrongPass1',
          lang: 'es',
          user: MOCK_USER,
          credential: MOCK_CREDENTIAL,
        };
        await expect(step.execute(ctx)).rejects.toThrow('ctx.refreshToken not set');
      });
    });
  });
});

// ─── CreateVerificationTokenStep ──────────────────────────────────────────────
describe('CreateVerificationTokenStep', () => {
  let step: CreateVerificationTokenStep;
  let codeGenerator: jest.Mocked<Pick<ICodeGeneratorContract, 'hashCode'>>;
  let verificationTokenContract: jest.Mocked<Pick<IEmailVerificationTokenContract, 'persist'>>;
  let configService: { get: jest.Mock };

  beforeEach(async () => {
    codeGenerator = { hashCode: jest.fn().mockReturnValue('code-hash') };
    verificationTokenContract = { persist: jest.fn().mockResolvedValue(undefined) };
    configService = { get: jest.fn().mockReturnValue(10) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateVerificationTokenStep,
        { provide: INJECTION_TOKENS.CODE_GENERATOR_CONTRACT, useValue: codeGenerator },
        { provide: INJECTION_TOKENS.EMAIL_VERIFICATION_TOKEN_CONTRACT, useValue: verificationTokenContract },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    step = module.get<CreateVerificationTokenStep>(CreateVerificationTokenStep);
  });

  describe('Given a context with user and verificationCode set', () => {
    describe('When execute() is called', () => {
      it('Then it persists the verification token', async () => {
        const ctx: SignUpSagaContext = {
          email: 'u@t.com',
          username: 'user',
          password: 'StrongPass1',
          lang: 'es',
          user: MOCK_USER,
          credential: MOCK_CREDENTIAL,
          verificationCode: 'ABC123',
        };
        await step.execute(ctx);
        expect(verificationTokenContract.persist).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Given a context without credential', () => {
    describe('When execute() is called', () => {
      it('Then it throws an invariant violation error', async () => {
        const ctx: SignUpSagaContext = {
          email: 'u@t.com',
          username: 'user',
          password: 'StrongPass1',
          lang: 'es',
          verificationCode: 'ABC123',
        };
        await expect(step.execute(ctx)).rejects.toThrow('ctx.credential not set');
      });
    });
  });

  describe('Given a context without verificationCode', () => {
    describe('When execute() is called', () => {
      it('Then it throws an invariant violation error', async () => {
        const ctx: SignUpSagaContext = {
          email: 'u@t.com',
          username: 'user',
          password: 'StrongPass1',
          lang: 'es',
          user: MOCK_USER,
          credential: MOCK_CREDENTIAL,
        };
        await expect(step.execute(ctx)).rejects.toThrow('ctx.verificationCode not set');
      });
    });
  });
});

// ─── PublishSignUpEventsStep ──────────────────────────────────────────────────
describe('PublishSignUpEventsStep', () => {
  let step: PublishSignUpEventsStep;
  let eventBus: { publish: jest.Mock };

  beforeEach(async () => {
    eventBus = { publish: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublishSignUpEventsStep,
        { provide: EventBus, useValue: eventBus },
      ],
    }).compile();

    step = module.get<PublishSignUpEventsStep>(PublishSignUpEventsStep);
  });

  describe('Given a context with user set', () => {
    describe('When execute() is called', () => {
      it('Then it publishes a UserSignedUpEvent', async () => {
        const ctx: SignUpSagaContext = {
          email: 'u@t.com',
          username: 'user',
          password: 'StrongPass1',
          lang: 'es',
          user: MOCK_USER,
          credential: MOCK_CREDENTIAL,
        };
        await step.execute(ctx);
        expect(eventBus.publish).toHaveBeenCalledWith(expect.any(UserSignedUpEvent));
      });
    });
  });

  describe('Given a context without user', () => {
    describe('When execute() is called', () => {
      it('Then it throws an invariant violation error', async () => {
        const ctx: SignUpSagaContext = {
          email: 'u@t.com',
          username: 'user',
          password: 'StrongPass1',
          lang: 'es',
        };
        await expect(step.execute(ctx)).rejects.toThrow('ctx.user not set');
      });
    });
  });
});

// ─── SendVerificationEmailStep ────────────────────────────────────────────────
describe('SendVerificationEmailStep', () => {
  let step: SendVerificationEmailStep;
  let emailProvider: jest.Mocked<Pick<IEmailProviderContract, 'sendVerificationEmail'>>;

  beforeEach(async () => {
    emailProvider = {
      sendVerificationEmail: jest.fn().mockResolvedValue({ id: 'email-id' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SendVerificationEmailStep,
        { provide: INJECTION_TOKENS.EMAIL_PROVIDER_CONTRACT, useValue: emailProvider },
      ],
    }).compile();

    step = module.get<SendVerificationEmailStep>(SendVerificationEmailStep);
  });

  describe('Given a context with user and verificationCode', () => {
    describe('When execute() is called', () => {
      it('Then it sends the verification email and sets ctx.emailSent to true', async () => {
        const ctx: SignUpSagaContext = {
          email: 'u@t.com',
          username: 'user',
          password: 'StrongPass1',
          lang: 'es',
          user: MOCK_USER,
          credential: MOCK_CREDENTIAL,
          verificationCode: 'ABC123',
        };
        await step.execute(ctx);
        expect(emailProvider.sendVerificationEmail).toHaveBeenCalledWith(
          MOCK_CREDENTIAL.email,
          'ABC123',
          ctx.username,
          'es',
        );
        expect(ctx.emailSent).toBe(true);
      });
    });
  });

  describe('Given a context without user', () => {
    describe('When execute() is called', () => {
      it('Then it throws an invariant violation error', async () => {
        const ctx: SignUpSagaContext = {
          email: 'u@t.com',
          username: 'user',
          password: 'StrongPass1',
          lang: 'es',
          verificationCode: 'ABC123',
        };
        await expect(step.execute(ctx)).rejects.toThrow('ctx.user not set');
      });
    });
  });

  describe('Given a context without verificationCode', () => {
    describe('When execute() is called', () => {
      it('Then it throws an invariant violation error', async () => {
        const ctx: SignUpSagaContext = {
          email: 'u@t.com',
          username: 'user',
          password: 'StrongPass1',
          lang: 'es',
          user: MOCK_USER,
          credential: MOCK_CREDENTIAL,
        };
        await expect(step.execute(ctx)).rejects.toThrow('ctx.verificationCode not set');
      });
    });
  });
});

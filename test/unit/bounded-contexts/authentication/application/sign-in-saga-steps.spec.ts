import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EventBus, EventPublisher } from '@nestjs/cqrs';
import { ValidateCredentialsStep } from '@authentication/application/sagas/sign-in/steps/sign-in-validate-credentials.saga-step';
import { GenerateSignInTokensStep } from '@authentication/application/sagas/sign-in/steps/sign-in-generate-tokens.saga-step';
import { CreateSignInSessionStep } from '@authentication/application/sagas/sign-in/steps/sign-in-create-session.saga-step';
import { PublishSignInEventsStep } from '@authentication/application/sagas/sign-in/steps/sign-in-publish-events.saga-step';
import { SignInSagaContext } from '@authentication/application/sagas/sign-in/sign-in.saga-context';
import { AuthenticationDomainService } from '@authentication/domain/services/authentication-domain.service';
import { InvalidCredentialsException } from '@authentication/domain/exceptions/invalid-credentials.exception';
import { AccountDeactivatedException } from '@authentication/domain/exceptions/account-deactivated.exception';
import { EmailNotVerifiedException } from '@authentication/domain/exceptions/email-not-verified.exception';
import { UserSignedInEvent } from '@authentication/domain/events/user-signed-in.event';
import { ISessionContract } from '@authentication/domain/contracts/session.contract';
import { MediatorService } from '@shared/infrastructure/mediator/mediator.service';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import * as bcrypt from 'bcrypt';
import { UserMother, CredentialAccountMother } from '@test/helpers/object-mother/user.mother';

const MOCK_USER = UserMother.create({
  id: 1,
  uuid: '550e8400-e29b-41d4-a716-446655440001',
});

const MOCK_CREDENTIAL = CredentialAccountMother.create({
  email: 'test@example.com',
  accountId: 1,
});

// ─── ValidateCredentialsStep ──────────────────────────────────────────────────
describe('ValidateCredentialsStep', () => {
  let step: ValidateCredentialsStep;
  let mediator: {
    user: {
      findUserByEmailOrUsername: jest.Mock;
      findUsernameByUUID: jest.Mock;
    };
  };

  const baseCtx: SignInSagaContext = {
    emailOrUsername: 'test@example.com',
    password: 'Password1',
  };

  beforeEach(async () => {
    mediator = {
      user: {
        findUserByEmailOrUsername: jest
          .fn()
          .mockResolvedValue({ user: MOCK_USER, credential: MOCK_CREDENTIAL }),
        findUsernameByUUID: jest.fn().mockResolvedValue('testuser'),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ValidateCredentialsStep,
        { provide: MediatorService, useValue: mediator },
      ],
    }).compile();

    step = module.get<ValidateCredentialsStep>(ValidateCredentialsStep);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Given a user who does not exist', () => {
    beforeEach(() => {
      mediator.user.findUserByEmailOrUsername.mockResolvedValue(null);
    });

    describe('When execute() is called', () => {
      it('Then it throws InvalidCredentialsException', async () => {
        await expect(step.execute({ ...baseCtx })).rejects.toThrow(InvalidCredentialsException);
      });
    });
  });

  describe('Given a social-only account with no passwordHash', () => {
    beforeEach(() => {
      mediator.user.findUserByEmailOrUsername.mockResolvedValue({
        user: MOCK_USER,
        credential: CredentialAccountMother.createSocialOnly(),
      });
    });

    describe('When execute() is called', () => {
      it('Then it throws InvalidCredentialsException', async () => {
        await expect(step.execute({ ...baseCtx })).rejects.toThrow(InvalidCredentialsException);
      });
    });
  });

  describe('Given a user with an incorrect password', () => {
    beforeEach(() => {
      jest.spyOn(AuthenticationDomainService, 'comparePasswords').mockResolvedValue(false);
    });

    describe('When execute() is called', () => {
      it('Then it throws InvalidCredentialsException', async () => {
        await expect(step.execute({ ...baseCtx })).rejects.toThrow(InvalidCredentialsException);
      });
    });
  });

  describe('Given a user whose account is archived', () => {
    beforeEach(() => {
      jest.spyOn(AuthenticationDomainService, 'comparePasswords').mockResolvedValue(true);
      mediator.user.findUserByEmailOrUsername.mockResolvedValue({
        user: UserMother.createArchived(),
        credential: MOCK_CREDENTIAL,
      });
    });

    describe('When execute() is called', () => {
      it('Then it throws AccountDeactivatedException', async () => {
        await expect(step.execute({ ...baseCtx })).rejects.toThrow(AccountDeactivatedException);
      });
    });
  });

  describe('Given an account with pending email verification', () => {
    beforeEach(() => {
      jest.spyOn(AuthenticationDomainService, 'comparePasswords').mockResolvedValue(true);
      mediator.user.findUserByEmailOrUsername.mockResolvedValue({
        user: MOCK_USER,
        credential: CredentialAccountMother.createPendingVerification(),
      });
    });

    describe('When execute() is called', () => {
      it('Then it throws EmailNotVerifiedException', async () => {
        await expect(step.execute({ ...baseCtx })).rejects.toThrow(EmailNotVerifiedException);
      });
    });
  });

  describe('Given a user with valid credentials and an active account', () => {
    beforeEach(() => {
      jest.spyOn(AuthenticationDomainService, 'comparePasswords').mockResolvedValue(true);
    });

    describe('When execute() is called', () => {
      it('Then it sets ctx.user and ctx.credential with the authenticated user', async () => {
        const ctx: SignInSagaContext = { ...baseCtx };
        await step.execute(ctx);
        expect(ctx.user).toBeDefined();
        expect(ctx.credential).toBeDefined();
        expect(ctx.credential!.email).toBe('test@example.com');
      });
    });
  });

  describe('Given valid credentials but no username profile exists', () => {
    beforeEach(() => {
      jest.spyOn(AuthenticationDomainService, 'comparePasswords').mockResolvedValue(true);
      mediator.user.findUsernameByUUID.mockResolvedValue(null);
    });

    describe('When execute() is called', () => {
      it('Then it falls back to the credential email as the username', async () => {
        const ctx: SignInSagaContext = { ...baseCtx };
        await step.execute(ctx);
        expect(ctx.username).toBe('test@example.com');
      });
    });
  });
});

// ─── GenerateSignInTokensStep ─────────────────────────────────────────────────
describe('GenerateSignInTokensStep', () => {
  let step: GenerateSignInTokensStep;
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
        GenerateSignInTokensStep,
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    step = module.get<GenerateSignInTokensStep>(GenerateSignInTokensStep);
  });

  describe('Given a context without user set', () => {
    describe('When execute() is called', () => {
      it('Then it throws an invariant violation error', async () => {
        const ctx: SignInSagaContext = {
          emailOrUsername: 'test@example.com',
          password: 'Password1',
        };
        await expect(step.execute(ctx)).rejects.toThrow('ctx.user not set');
      });
    });
  });

  describe('Given a context without credential set', () => {
    describe('When execute() is called', () => {
      it('Then it throws an invariant violation error', async () => {
        const ctx: SignInSagaContext = {
          emailOrUsername: 'test@example.com',
          password: 'Password1',
          user: MOCK_USER,
        };
        await expect(step.execute(ctx)).rejects.toThrow('ctx.credential not set');
      });
    });
  });

  describe('Given a context with user and credential set', () => {
    describe('When execute() is called', () => {
      it('Then it sets accessToken and refreshToken on the context', async () => {
        const ctx: SignInSagaContext = {
          emailOrUsername: 'test@example.com',
          password: 'Password1',
          user: MOCK_USER,
          credential: MOCK_CREDENTIAL,
        };
        await step.execute(ctx);
        expect(ctx.accessToken).toBe('jwt-token');
        expect(ctx.refreshToken).toBe('jwt-token');
      });
    });
  });

  describe('Given configService returns undefined for expiration keys', () => {
    describe('When execute() is called', () => {
      it('Then it falls back to the default expiration values (15m / 7d)', async () => {
        const configWithUndefined = {
          get: jest.fn().mockReturnValue(undefined),
          getOrThrow: jest.fn().mockReturnValue('jwt-secret'),
        };

        const module: TestingModule = await Test.createTestingModule({
          providers: [
            GenerateSignInTokensStep,
            { provide: JwtService, useValue: jwtService },
            { provide: ConfigService, useValue: configWithUndefined },
          ],
        }).compile();

        const stepWithDefaults = module.get<GenerateSignInTokensStep>(GenerateSignInTokensStep);
        const ctx: SignInSagaContext = {
          emailOrUsername: 'test@example.com',
          password: 'Password1',
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

// ─── CreateSignInSessionStep ──────────────────────────────────────────────────
describe('CreateSignInSessionStep', () => {
  let step: CreateSignInSessionStep;
  let sessionContract: jest.Mocked<Pick<ISessionContract, 'persist'>>;

  beforeEach(async () => {
    sessionContract = {
      persist: jest.fn().mockResolvedValue({ uuid: 'session-uuid', commit: jest.fn() }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateSignInSessionStep,
        { provide: INJECTION_TOKENS.SESSION_CONTRACT, useValue: sessionContract },
      ],
    }).compile();

    step = module.get<CreateSignInSessionStep>(CreateSignInSessionStep);
  });

  describe('Given a context without user', () => {
    describe('When execute() is called', () => {
      it('Then it throws an invariant violation error', async () => {
        const ctx: SignInSagaContext = {
          emailOrUsername: 'test@example.com',
          password: 'Password1',
          refreshToken: 'refresh-token',
          credential: MOCK_CREDENTIAL,
        };
        await expect(step.execute(ctx)).rejects.toThrow('ctx.user not set');
      });
    });
  });

  describe('Given a context without refreshToken', () => {
    describe('When execute() is called', () => {
      it('Then it throws an invariant violation error', async () => {
        const ctx: SignInSagaContext = {
          emailOrUsername: 'test@example.com',
          password: 'Password1',
          user: MOCK_USER,
          credential: MOCK_CREDENTIAL,
        };
        await expect(step.execute(ctx)).rejects.toThrow('ctx.refreshToken not set');
      });
    });
  });

  describe('Given a context without credential', () => {
    describe('When execute() is called', () => {
      it('Then it throws an invariant violation error', async () => {
        const ctx: SignInSagaContext = {
          emailOrUsername: 'test@example.com',
          password: 'Password1',
          user: MOCK_USER,
          refreshToken: 'refresh-token',
        };
        await expect(step.execute(ctx)).rejects.toThrow('ctx.credential not set');
      });
    });
  });

  describe('Given a context with user, credential, and refreshToken set', () => {
    describe('When execute() is called', () => {
      it('Then it creates and persists the session and sets ctx.session', async () => {
        const ctx: SignInSagaContext = {
          emailOrUsername: 'test@example.com',
          password: 'Password1',
          user: MOCK_USER,
          credential: MOCK_CREDENTIAL,
          refreshToken: 'refresh-token',
        };
        await step.execute(ctx);
        expect(sessionContract.persist).toHaveBeenCalledTimes(1);
        expect(ctx.session).toBeDefined();
      });
    });
  });
});

// ─── PublishSignInEventsStep ──────────────────────────────────────────────────
describe('PublishSignInEventsStep', () => {
  let step: PublishSignInEventsStep;
  let eventBus: { publish: jest.Mock };
  let eventPublisher: { mergeObjectContext: jest.Mock };

  beforeEach(async () => {
    eventBus = { publish: jest.fn() };
    eventPublisher = { mergeObjectContext: jest.fn().mockImplementation((obj) => obj) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublishSignInEventsStep,
        { provide: EventBus, useValue: eventBus },
        { provide: EventPublisher, useValue: eventPublisher },
      ],
    }).compile();

    step = module.get<PublishSignInEventsStep>(PublishSignInEventsStep);
  });

  describe('Given a context without user', () => {
    describe('When execute() is called', () => {
      it('Then it throws an invariant violation error', () => {
        const ctx: SignInSagaContext = {
          emailOrUsername: 'test@example.com',
          password: 'Password1',
          session: {
            uuid: 'session-uuid',
            commit: jest.fn(),
          } as unknown as SignInSagaContext['session'],
        };
        expect(() => step.execute(ctx)).toThrow('ctx.user not set');
      });
    });
  });

  describe('Given a context without session', () => {
    describe('When execute() is called', () => {
      it('Then it throws an invariant violation error', () => {
        const ctx: SignInSagaContext = {
          emailOrUsername: 'test@example.com',
          password: 'Password1',
          user: MOCK_USER,
        };
        expect(() => step.execute(ctx)).toThrow('ctx.session not set');
      });
    });
  });

  describe('Given a context with user and session set', () => {
    describe('When execute() is called', () => {
      it('Then it publishes SessionCreatedEvent via commit and a UserSignedInEvent via eventBus', async () => {
        const mockSession = { uuid: 'session-uuid', commit: jest.fn() };
        const ctx: SignInSagaContext = {
          emailOrUsername: 'test@example.com',
          password: 'Password1',
          user: MOCK_USER,
          session: mockSession as unknown as SignInSagaContext['session'],
        };
        await step.execute(ctx);
        expect(eventPublisher.mergeObjectContext).toHaveBeenCalledWith(mockSession);
        expect(mockSession.commit).toHaveBeenCalledTimes(1);
        expect(eventBus.publish).toHaveBeenCalledWith(expect.any(UserSignedInEvent));
      });
    });
  });
});

// ─── AuthenticationDomainService.comparePasswords ────────────────────────────
describe('AuthenticationDomainService', () => {
  describe('comparePasswords', () => {
    describe('Given a plain password and its bcrypt hash', () => {
      it('Then it returns true when they match', async () => {
        const hash = await bcrypt.hash('TestPass1', 4);
        await expect(
          AuthenticationDomainService.comparePasswords('TestPass1', hash),
        ).resolves.toBe(true);
      });
    });
  });
});

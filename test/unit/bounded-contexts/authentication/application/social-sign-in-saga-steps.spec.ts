import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EventBus } from '@nestjs/cqrs';
import { CreateSocialSessionStep } from '@authentication/application/sagas/social-sign-in/steps/social-sign-in-create-session.saga-step';
import { GenerateSocialTokensStep } from '@authentication/application/sagas/social-sign-in/steps/social-sign-in-generate-tokens.saga-step';
import { PublishSocialSignInEventsStep } from '@authentication/application/sagas/social-sign-in/steps/social-sign-in-publish-events.saga-step';
import { ResolveSocialUserStep } from '@authentication/application/sagas/social-sign-in/steps/social-sign-in-resolve-user.saga-step';
import { SocialSignInSagaContext } from '@authentication/application/sagas/social-sign-in/social-sign-in.saga-context';
import { ISessionContract } from '@authentication/domain/contracts/session.contract';
import { UserSignedInEvent } from '@authentication/domain/events/user-signed-in.event';
import { MediatorService } from '@shared/infrastructure/mediator/mediator.service';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { UserMother } from '@test/helpers/object-mother/user.mother';

const MOCK_USER = UserMother.create({ id: 1, uuid: '550e8400-e29b-41d4-a716-446655440010', email: 'u@test.com', username: 'tester' });

// ─── CreateSocialSessionStep ──────────────────────────────────────────────────
describe('CreateSocialSessionStep', () => {
  let step: CreateSocialSessionStep;
  let sessionContract: jest.Mocked<Pick<ISessionContract, 'persist'>>;

  beforeEach(async () => {
    sessionContract = {
      persist: jest.fn().mockResolvedValue({ uuid: 'new-session-uuid' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateSocialSessionStep,
        { provide: INJECTION_TOKENS.SESSION_CONTRACT, useValue: sessionContract },
      ],
    }).compile();

    step = module.get<CreateSocialSessionStep>(CreateSocialSessionStep);
  });

  describe('Given a context with user and refreshToken set', () => {
    describe('When execute() is called', () => {
      it('Then it creates and persists a new session', async () => {
        const ctx: SocialSignInSagaContext = {
          email: 'u@test.com',
          displayName: 'Test User',
          provider: 'google',
          providerId: 'google-id-123',
          user: MOCK_USER as unknown as SocialSignInSagaContext['user'],
          refreshToken: 'social-refresh-token',
        };
        await step.execute(ctx);
        expect(sessionContract.persist).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Given a context without user', () => {
    describe('When execute() is called', () => {
      it('Then it throws an invariant violation error', async () => {
        const ctx: SocialSignInSagaContext = {
          email: 'u@test.com',
          displayName: 'Test',
          provider: 'google',
          providerId: 'gid',
          refreshToken: 'tok',
        };
        await expect(step.execute(ctx)).rejects.toThrow('ctx.user not set');
      });
    });
  });

  describe('Given a context without refreshToken', () => {
    describe('When execute() is called', () => {
      it('Then it throws an invariant violation error', async () => {
        const ctx: SocialSignInSagaContext = {
          email: 'u@test.com',
          displayName: 'Test',
          provider: 'google',
          providerId: 'gid',
          user: MOCK_USER as unknown as SocialSignInSagaContext['user'],
        };
        await expect(step.execute(ctx)).rejects.toThrow('ctx.refreshToken not set');
      });
    });
  });
});

// ─── GenerateSocialTokensStep ─────────────────────────────────────────────────
describe('GenerateSocialTokensStep', () => {
  let step: GenerateSocialTokensStep;
  let jwtService: jest.Mocked<Pick<JwtService, 'signAsync'>>;
  let configService: { get: jest.Mock; getOrThrow: jest.Mock };

  beforeEach(async () => {
    jwtService = { signAsync: jest.fn().mockResolvedValue('signed-token') };
    configService = {
      get: jest.fn().mockImplementation((key: string) => {
        const map: Record<string, string> = {
          JWT_ACCESS_EXPIRATION: '15m',
          JWT_REFRESH_EXPIRATION: '7d',
        };
        return map[key];
      }),
      getOrThrow: jest.fn().mockReturnValue('secret'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GenerateSocialTokensStep,
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    step = module.get<GenerateSocialTokensStep>(GenerateSocialTokensStep);
  });

  describe('Given a context with user set', () => {
    describe('When execute() is called', () => {
      it('Then it generates and sets accessToken and refreshToken on the context', async () => {
        const ctx: SocialSignInSagaContext = {
          email: 'u@test.com',
          displayName: 'Test User',
          provider: 'google',
          providerId: 'gid',
          user: MOCK_USER as unknown as SocialSignInSagaContext['user'],
        };
        await step.execute(ctx);
        expect(ctx.accessToken).toBe('signed-token');
        expect(ctx.refreshToken).toBe('signed-token');
        expect(jwtService.signAsync).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Given a context without user', () => {
    describe('When execute() is called', () => {
      it('Then it throws an invariant violation error', async () => {
        const ctx: SocialSignInSagaContext = {
          email: 'u@test.com',
          displayName: 'Test',
          provider: 'google',
          providerId: 'gid',
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
          getOrThrow: jest.fn().mockReturnValue('secret'),
        };

        const newModule: TestingModule = await Test.createTestingModule({
          providers: [
            GenerateSocialTokensStep,
            { provide: JwtService, useValue: jwtService },
            { provide: ConfigService, useValue: configWithUndefined },
          ],
        }).compile();

        const stepWithDefaults = newModule.get<GenerateSocialTokensStep>(GenerateSocialTokensStep);
        const ctx: SocialSignInSagaContext = {
          email: 'u@test.com',
          displayName: 'Test User',
          provider: 'google',
          providerId: 'gid',
          user: MOCK_USER as unknown as SocialSignInSagaContext['user'],
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

// ─── PublishSocialSignInEventsStep ────────────────────────────────────────────
describe('PublishSocialSignInEventsStep', () => {
  let step: PublishSocialSignInEventsStep;
  let eventBus: { publish: jest.Mock };

  beforeEach(async () => {
    eventBus = { publish: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublishSocialSignInEventsStep,
        { provide: EventBus, useValue: eventBus },
      ],
    }).compile();

    step = module.get<PublishSocialSignInEventsStep>(PublishSocialSignInEventsStep);
  });

  describe('Given a context with user set', () => {
    describe('When execute() is called', () => {
      it('Then it publishes a UserSignedInEvent with the user UUID', async () => {
        const ctx: SocialSignInSagaContext = {
          email: 'u@test.com',
          displayName: 'Test',
          provider: 'google',
          providerId: 'gid',
          user: MOCK_USER as unknown as SocialSignInSagaContext['user'],
        };
        await step.execute(ctx);
        expect(eventBus.publish).toHaveBeenCalledWith(expect.any(UserSignedInEvent));
        const published = eventBus.publish.mock.calls[0][0] as UserSignedInEvent;
        expect(published.userUUID).toBe(MOCK_USER.uuid);
      });
    });
  });

  describe('Given a context without user', () => {
    describe('When execute() is called', () => {
      it('Then it throws an invariant violation error', async () => {
        const ctx: SocialSignInSagaContext = {
          email: 'u@test.com',
          displayName: 'Test',
          provider: 'google',
          providerId: 'gid',
        };
        await expect(step.execute(ctx)).rejects.toThrow('ctx.user not set');
      });
    });
  });
});

// ─── ResolveSocialUserStep ────────────────────────────────────────────────────
describe('ResolveSocialUserStep', () => {
  let step: ResolveSocialUserStep;
  let mediator: {
    user: {
      findUserBySocialProvider: jest.Mock;
      findByEmail: jest.Mock;
      linkProviderToUser: jest.Mock;
      findById: jest.Mock;
      createUserFromSocial: jest.Mock;
      existsByUsername: jest.Mock;
    };
  };

  const BASE_CTX: SocialSignInSagaContext = {
    email: 'user@test.com',
    displayName: 'Google User',
    provider: 'google',
    providerId: 'google-id-001',
  };

  beforeEach(async () => {
    mediator = {
      user: {
        findUserBySocialProvider: jest.fn(),
        findByEmail: jest.fn(),
        linkProviderToUser: jest.fn().mockResolvedValue(undefined),
        findById: jest.fn(),
        createUserFromSocial: jest.fn(),
        existsByUsername: jest.fn().mockResolvedValue(false),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResolveSocialUserStep,
        { provide: MediatorService, useValue: mediator },
      ],
    }).compile();

    step = module.get<ResolveSocialUserStep>(ResolveSocialUserStep);
  });

  describe('Given an existing user linked to the provider (Path A)', () => {
    beforeEach(() => {
      mediator.user.findUserBySocialProvider.mockResolvedValue(MOCK_USER);
    });

    describe('When execute() is called', () => {
      it('Then it sets ctx.user and ctx.path to existing-provider', async () => {
        const ctx = { ...BASE_CTX };
        await step.execute(ctx);
        expect(ctx.user).toBeDefined();
        expect(ctx.path).toBe('existing-provider');
        expect(mediator.user.findByEmail).not.toHaveBeenCalled();
      });
    });
  });

  describe('Given an existing user found by email but with different auth method (Path B)', () => {
    beforeEach(() => {
      mediator.user.findUserBySocialProvider.mockResolvedValue(null);
      mediator.user.findByEmail.mockResolvedValue(MOCK_USER);
      mediator.user.findById.mockResolvedValue(MOCK_USER);
    });

    describe('When execute() is called', () => {
      it('Then it links the provider and sets ctx.path to linked-provider', async () => {
        const ctx = { ...BASE_CTX };
        await step.execute(ctx);
        expect(mediator.user.linkProviderToUser).toHaveBeenCalledWith(
          MOCK_USER.id,
          'google',
          'google-id-001',
        );
        expect(ctx.path).toBe('linked-provider');
      });
    });
  });

  describe('Given a brand new user not in the system (Path C)', () => {
    beforeEach(() => {
      mediator.user.findUserBySocialProvider.mockResolvedValue(null);
      mediator.user.findByEmail.mockResolvedValue(null);
      mediator.user.createUserFromSocial.mockResolvedValue(MOCK_USER);
    });

    describe('When execute() is called', () => {
      it('Then it creates a new user and sets ctx.path to new-user', async () => {
        const ctx = { ...BASE_CTX };
        await step.execute(ctx);
        expect(mediator.user.createUserFromSocial).toHaveBeenCalled();
        expect(ctx.path).toBe('new-user');
      });
    });
  });

  describe('Given Path B but the user disappears after linking', () => {
    beforeEach(() => {
      mediator.user.findUserBySocialProvider.mockResolvedValue(null);
      mediator.user.findByEmail.mockResolvedValue(MOCK_USER);
      mediator.user.findById.mockResolvedValue(null); // user not found after linking
    });

    describe('When execute() is called', () => {
      it('Then it throws an invariant violation error', async () => {
        const ctx = { ...BASE_CTX };
        await expect(step.execute(ctx)).rejects.toThrow(
          'user disappeared after linking provider',
        );
      });
    });
  });

  describe('Given Path C where the generated username already exists (collision)', () => {
    describe('When existsByUsername returns true initially then false', () => {
      it('Then the while loop retries until a unique username is found', async () => {
        mediator.user.findUserBySocialProvider.mockResolvedValue(null);
        mediator.user.findByEmail.mockResolvedValue(null);
        mediator.user.existsByUsername
          .mockResolvedValueOnce(true)  // first attempt: collision
          .mockResolvedValueOnce(false); // second attempt: unique
        mediator.user.createUserFromSocial.mockResolvedValue(MOCK_USER);

        const ctx = { ...BASE_CTX };
        await step.execute(ctx);

        expect(mediator.user.existsByUsername).toHaveBeenCalledTimes(2);
        expect(mediator.user.createUserFromSocial).toHaveBeenCalledTimes(1);
        expect(ctx.path).toBe('new-user');
      });
    });
  });

  describe('Given Path C where displayName contains only non-word characters', () => {
    describe('When the sanitized displayName becomes empty', () => {
      it('Then it falls back to the username "user"', async () => {
        mediator.user.findUserBySocialProvider.mockResolvedValue(null);
        mediator.user.findByEmail.mockResolvedValue(null);
        mediator.user.existsByUsername.mockResolvedValue(false);
        mediator.user.createUserFromSocial.mockResolvedValue(MOCK_USER);

        const ctx: SocialSignInSagaContext = {
          ...BASE_CTX,
          displayName: '!!!', // sanitizes to '' → falls back to 'user'
        };
        await step.execute(ctx);

        expect(mediator.user.createUserFromSocial).toHaveBeenCalledWith(
          BASE_CTX.email,
          'user',
          BASE_CTX.provider,
          BASE_CTX.providerId,
        );
        expect(ctx.path).toBe('new-user');
      });
    });
  });
});

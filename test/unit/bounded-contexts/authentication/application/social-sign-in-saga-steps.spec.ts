import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EventBus } from '@nestjs/cqrs';
import { CreateSocialSessionStep } from '@authentication/application/sagas/social-sign-in/steps/social-sign-in-create-session.saga-step';
import { GenerateSocialTokensStep } from '@authentication/application/sagas/social-sign-in/steps/social-sign-in-generate-tokens.saga-step';
import { PublishSocialSignInEventsStep } from '@authentication/application/sagas/social-sign-in/steps/social-sign-in-publish-events.saga-step';
import { ResolveSocialUserStep } from '@authentication/application/sagas/social-sign-in/steps/social-sign-in-resolve-user.saga-step';
import { SyncSocialProfileStep } from '@authentication/application/sagas/social-sign-in/steps/social-sign-in-sync-profile.saga-step';
import { SocialSignInSagaContext } from '@authentication/application/sagas/social-sign-in/social-sign-in.saga-context';
import { ISessionContract } from '@authentication/domain/contracts/session.contract';
import { UserSignedInEvent } from '@authentication/domain/events/user-signed-in.event';
import { MediatorService } from '@shared/infrastructure/mediator/mediator.service';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { UserMother, CredentialAccountMother } from '@test/helpers/object-mother/user.mother';

const MOCK_USER = UserMother.create({ id: 1, uuid: '550e8400-e29b-41d4-a716-446655440010' });
const MOCK_CREDENTIAL = CredentialAccountMother.createWithEmail('u@test.com');

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
          givenName: null,
          familyName: null,
          avatarUrl: null,
          locale: null,
          emailVerified: false,
          jobTitle: null,
          rawData: {},
          user: MOCK_USER as unknown as SocialSignInSagaContext['user'],
          refreshToken: 'social-refresh-token',
          accountId: 10,
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
          givenName: null,
          familyName: null,
          avatarUrl: null,
          locale: null,
          emailVerified: false,
          jobTitle: null,
          rawData: {},
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
          givenName: null,
          familyName: null,
          avatarUrl: null,
          locale: null,
          emailVerified: false,
          jobTitle: null,
          rawData: {},
          user: MOCK_USER as unknown as SocialSignInSagaContext['user'],
        };
        await expect(step.execute(ctx)).rejects.toThrow('ctx.refreshToken not set');
      });
    });
  });

  describe('Given a context without accountId', () => {
    describe('When execute() is called', () => {
      it('Then it throws an invariant violation error', async () => {
        const ctx: SocialSignInSagaContext = {
          email: 'u@test.com',
          displayName: 'Test',
          provider: 'google',
          providerId: 'gid',
          givenName: null,
          familyName: null,
          avatarUrl: null,
          locale: null,
          emailVerified: false,
          jobTitle: null,
          rawData: {},
          user: MOCK_USER as unknown as SocialSignInSagaContext['user'],
          refreshToken: 'tok',
        };
        await expect(step.execute(ctx)).rejects.toThrow('ctx.accountId not set');
      });
    });
  });
});

// ─── GenerateSocialTokensStep ─────────────────────────────────────────────────
describe('GenerateSocialTokensStep', () => {
  let step: GenerateSocialTokensStep;
  let jwtService: jest.Mocked<Pick<JwtService, 'signAsync'>>;
  let configService: { get: jest.Mock; getOrThrow: jest.Mock };
  let mediator: {
    tenant: { getActiveMembership: jest.Mock };
    user: { findDisplayNameByUserUUID: jest.Mock };
  };

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
    mediator = {
      tenant: {
        getActiveMembership: jest.fn().mockResolvedValue(null),
      },
      user: {
        findDisplayNameByUserUUID: jest.fn().mockResolvedValue(null),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GenerateSocialTokensStep,
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
        { provide: MediatorService, useValue: mediator },
      ],
    }).compile();

    step = module.get<GenerateSocialTokensStep>(GenerateSocialTokensStep);
  });

  describe('Given a context with user and credential set', () => {
    describe('When execute() is called', () => {
      it('Then it generates and sets accessToken and refreshToken on the context', async () => {
        const ctx: SocialSignInSagaContext = {
          email: 'u@test.com',
          displayName: 'Test User',
          provider: 'google',
          providerId: 'gid',
          givenName: null,
          familyName: null,
          avatarUrl: null,
          locale: null,
          emailVerified: false,
          jobTitle: null,
          rawData: {},
          user: MOCK_USER as unknown as SocialSignInSagaContext['user'],
          credential: MOCK_CREDENTIAL as unknown as SocialSignInSagaContext['credential'],
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
          givenName: null,
          familyName: null,
          avatarUrl: null,
          locale: null,
          emailVerified: false,
          jobTitle: null,
          rawData: {},
        };
        await expect(step.execute(ctx)).rejects.toThrow('ctx.user not set');
      });
    });
  });

  describe('Given a context without credential', () => {
    describe('When execute() is called', () => {
      it('Then it throws an invariant violation error', async () => {
        const ctx: SocialSignInSagaContext = {
          email: 'u@test.com',
          displayName: 'Test',
          provider: 'google',
          providerId: 'gid',
          givenName: null,
          familyName: null,
          avatarUrl: null,
          locale: null,
          emailVerified: false,
          jobTitle: null,
          rawData: {},
          user: MOCK_USER as unknown as SocialSignInSagaContext['user'],
        };
        await expect(step.execute(ctx)).rejects.toThrow('ctx.credential not set');
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
            { provide: MediatorService, useValue: mediator },
          ],
        }).compile();

        const stepWithDefaults = newModule.get<GenerateSocialTokensStep>(GenerateSocialTokensStep);
        const ctx: SocialSignInSagaContext = {
          email: 'u@test.com',
          displayName: 'Test User',
          provider: 'google',
          providerId: 'gid',
          givenName: null,
          familyName: null,
          avatarUrl: null,
          locale: null,
          emailVerified: false,
          jobTitle: null,
          rawData: {},
          user: MOCK_USER as unknown as SocialSignInSagaContext['user'],
          credential: MOCK_CREDENTIAL as unknown as SocialSignInSagaContext['credential'],
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
      providers: [PublishSocialSignInEventsStep, { provide: EventBus, useValue: eventBus }],
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
          givenName: null,
          familyName: null,
          avatarUrl: null,
          locale: null,
          emailVerified: false,
          jobTitle: null,
          rawData: {},
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
          givenName: null,
          familyName: null,
          avatarUrl: null,
          locale: null,
          emailVerified: false,
          jobTitle: null,
          rawData: {},
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
      findUserByEmail: jest.Mock;
      linkSocialAccount: jest.Mock;
      createUserFromOAuth: jest.Mock;
      existsByUsername: jest.Mock;
    };
  };

  const BASE_CTX: SocialSignInSagaContext = {
    email: 'user@test.com',
    displayName: 'Google User',
    provider: 'google',
    providerId: 'google-id-001',
    givenName: null,
    familyName: null,
    avatarUrl: null,
    locale: null,
    emailVerified: false,
    jobTitle: null,
    rawData: {},
  };

  const MOCK_SOCIAL = { accountId: 20, uuid: 'social-uuid-001' };
  const MOCK_CREDENTIAL = { email: 'user@test.com', id: 5 };
  const MOCK_USER_WITH_SOCIAL = { user: MOCK_USER, social: MOCK_SOCIAL };
  const MOCK_USER_WITH_CREDENTIAL = { user: MOCK_USER, credential: MOCK_CREDENTIAL };
  const MOCK_OAUTH_RESULT = {
    user: MOCK_USER,
    credential: MOCK_CREDENTIAL,
    social: MOCK_SOCIAL,
  };

  beforeEach(async () => {
    mediator = {
      user: {
        findUserBySocialProvider: jest.fn(),
        findUserByEmail: jest.fn(),
        linkSocialAccount: jest.fn().mockResolvedValue(MOCK_SOCIAL),
        createUserFromOAuth: jest.fn().mockResolvedValue(MOCK_OAUTH_RESULT),
        existsByUsername: jest.fn().mockResolvedValue(false),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ResolveSocialUserStep, { provide: MediatorService, useValue: mediator }],
    }).compile();

    step = module.get<ResolveSocialUserStep>(ResolveSocialUserStep);
  });

  describe('Given an existing user linked to the provider (Path A)', () => {
    beforeEach(() => {
      mediator.user.findUserBySocialProvider.mockResolvedValue(MOCK_USER_WITH_SOCIAL);
      mediator.user.findUserByEmail.mockResolvedValue(MOCK_USER_WITH_CREDENTIAL);
    });

    describe('When execute() is called', () => {
      it('Then it sets ctx.user and ctx.path to existing-provider', async () => {
        const ctx = { ...BASE_CTX };
        await step.execute(ctx);
        expect(ctx.user).toBeDefined();
        expect(ctx.path).toBe('existing-provider');
        expect(mediator.user.linkSocialAccount).not.toHaveBeenCalled();
      });
    });
  });

  describe('Given an existing user linked to the provider but with no email account (Path A, no credential)', () => {
    beforeEach(() => {
      mediator.user.findUserBySocialProvider.mockResolvedValue(MOCK_USER_WITH_SOCIAL);
      mediator.user.findUserByEmail.mockResolvedValue(null);
    });

    describe('When execute() is called', () => {
      it('Then it sets ctx.user without setting ctx.credential', async () => {
        const ctx = { ...BASE_CTX };
        await step.execute(ctx);
        expect(ctx.user).toBeDefined();
        expect(ctx.path).toBe('existing-provider');
        expect(ctx.credential).toBeUndefined();
      });
    });
  });

  describe('Given an existing user found by email but with a different auth method (Path B)', () => {
    beforeEach(() => {
      mediator.user.findUserBySocialProvider.mockResolvedValue(null);
      mediator.user.findUserByEmail.mockResolvedValue(MOCK_USER_WITH_CREDENTIAL);
    });

    describe('When execute() is called', () => {
      it('Then it links the provider and sets ctx.path to linked-provider', async () => {
        const ctx = { ...BASE_CTX };
        await step.execute(ctx);
        expect(mediator.user.linkSocialAccount).toHaveBeenCalledWith(MOCK_USER.id, {
          provider: 'google',
          providerId: 'google-id-001',
        });
        expect(ctx.path).toBe('linked-provider');
      });
    });
  });

  describe('Given an existing user found by email but the user has no id (Path B edge case)', () => {
    beforeEach(() => {
      mediator.user.findUserBySocialProvider.mockResolvedValue(null);
      mediator.user.findUserByEmail.mockResolvedValue({
        user: { ...MOCK_USER, id: undefined },
        credential: MOCK_CREDENTIAL,
      });
    });

    describe('When execute() is called', () => {
      it('Then it throws an invariant violation error', async () => {
        const ctx = { ...BASE_CTX };
        await expect(step.execute(ctx)).rejects.toThrow('ResolveSocialUserStep: user has no id');
      });
    });
  });

  describe('Given a brand new user not in the system (Path C)', () => {
    beforeEach(() => {
      mediator.user.findUserBySocialProvider.mockResolvedValue(null);
      mediator.user.findUserByEmail.mockResolvedValue(null);
    });

    describe('When execute() is called', () => {
      it('Then it creates a new user via OAuth and sets ctx.path to new-user', async () => {
        const ctx = { ...BASE_CTX };
        await step.execute(ctx);
        expect(mediator.user.createUserFromOAuth).toHaveBeenCalled();
        expect(ctx.path).toBe('new-user');
      });
    });
  });

  describe('Given Path C where the generated username already exists (collision)', () => {
    describe('When existsByUsername returns true initially then false', () => {
      it('Then the while loop retries until a unique username is found', async () => {
        mediator.user.findUserBySocialProvider.mockResolvedValue(null);
        mediator.user.findUserByEmail.mockResolvedValue(null);
        mediator.user.existsByUsername
          .mockResolvedValueOnce(true) // first attempt: collision
          .mockResolvedValueOnce(false); // second attempt: unique

        const ctx = { ...BASE_CTX };
        await step.execute(ctx);

        expect(mediator.user.existsByUsername).toHaveBeenCalledTimes(2);
        expect(mediator.user.createUserFromOAuth).toHaveBeenCalledTimes(1);
        expect(ctx.path).toBe('new-user');
      });
    });
  });

  describe('Given Path C where displayName contains only non-word characters', () => {
    describe('When the sanitized displayName becomes empty', () => {
      it('Then it falls back to the username "user"', async () => {
        mediator.user.findUserBySocialProvider.mockResolvedValue(null);
        mediator.user.findUserByEmail.mockResolvedValue(null);
        mediator.user.existsByUsername.mockResolvedValue(false);

        const ctx: SocialSignInSagaContext = {
          ...BASE_CTX,
          displayName: '!!!',
        };
        await step.execute(ctx);

        expect(mediator.user.createUserFromOAuth).toHaveBeenCalledWith(
          expect.objectContaining({ username: 'user' }),
        );
        expect(ctx.path).toBe('new-user');
      });
    });
  });

  describe('Given Path C where locale includes a region tag (e.g. "es-MX")', () => {
    describe('When execute() is called', () => {
      it('Then normalizeLocale strips the region and passes the base language to createUserFromOAuth', async () => {
        mediator.user.findUserBySocialProvider.mockResolvedValue(null);
        mediator.user.findUserByEmail.mockResolvedValue(null);
        mediator.user.existsByUsername.mockResolvedValue(false);

        const ctx: SocialSignInSagaContext = { ...BASE_CTX, locale: 'es-MX' };
        await step.execute(ctx);

        expect(mediator.user.createUserFromOAuth).toHaveBeenCalledWith(
          expect.objectContaining({ locale: 'es' }),
        );
      });
    });
  });

  describe('Given Path C where locale is an unsupported language (e.g. "fr-FR")', () => {
    describe('When execute() is called', () => {
      it('Then normalizeLocale falls back to "es"', async () => {
        mediator.user.findUserBySocialProvider.mockResolvedValue(null);
        mediator.user.findUserByEmail.mockResolvedValue(null);
        mediator.user.existsByUsername.mockResolvedValue(false);

        const ctx: SocialSignInSagaContext = { ...BASE_CTX, locale: 'fr-FR' };
        await step.execute(ctx);

        expect(mediator.user.createUserFromOAuth).toHaveBeenCalledWith(
          expect.objectContaining({ locale: 'es' }),
        );
      });
    });
  });
});

// ─── SyncSocialProfileStep ────────────────────────────────────────────────────
describe('SyncSocialProfileStep', () => {
  let step: SyncSocialProfileStep;
  let mediator: { user: { upsertSocialProfile: jest.Mock } };

  const BASE_CTX: SocialSignInSagaContext = {
    email: 'user@test.com',
    displayName: 'Google User',
    provider: 'google',
    providerId: 'google-id-001',
    givenName: 'Google',
    familyName: 'User',
    avatarUrl: 'https://example.com/avatar.jpg',
    locale: 'es',
    emailVerified: true,
    jobTitle: null,
    rawData: { sub: 'google-id-001' },
  };

  beforeEach(async () => {
    mediator = {
      user: {
        upsertSocialProfile: jest.fn().mockResolvedValue(undefined),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [SyncSocialProfileStep, { provide: MediatorService, useValue: mediator }],
    }).compile();

    step = module.get<SyncSocialProfileStep>(SyncSocialProfileStep);
  });

  describe('Given a context with user and socialAccountUUID set after the UoW has committed', () => {
    describe('When execute() is called', () => {
      it('Then it calls upsertSocialProfile with the full profile data from the context', async () => {
        const ctx: SocialSignInSagaContext = {
          ...BASE_CTX,
          user: MOCK_USER as unknown as SocialSignInSagaContext['user'],
          socialAccountUUID: 'social-uuid-001',
        };

        await step.execute(ctx);

        expect(mediator.user.upsertSocialProfile).toHaveBeenCalledTimes(1);
        expect(mediator.user.upsertSocialProfile).toHaveBeenCalledWith({
          userUUID: MOCK_USER.uuid,
          socialAccountUUID: 'social-uuid-001',
          provider: 'google',
          providerDisplayName: 'Google User',
          providerAvatarUrl: 'https://example.com/avatar.jpg',
          givenName: 'Google',
          familyName: 'User',
          locale: 'es',
          emailVerified: true,
          jobTitle: null,
          rawData: { sub: 'google-id-001' },
        });
      });
    });
  });

  describe('Given a context where the user has not been resolved yet', () => {
    describe('When execute() is called without ctx.user', () => {
      it('Then it returns early without calling upsertSocialProfile', async () => {
        const ctx: SocialSignInSagaContext = {
          ...BASE_CTX,
          socialAccountUUID: 'social-uuid-001',
        };

        await step.execute(ctx);

        expect(mediator.user.upsertSocialProfile).not.toHaveBeenCalled();
      });
    });
  });

  describe('Given a context where the social account UUID has not been resolved yet', () => {
    describe('When execute() is called without ctx.socialAccountUUID', () => {
      it('Then it returns early without calling upsertSocialProfile', async () => {
        const ctx: SocialSignInSagaContext = {
          ...BASE_CTX,
          user: MOCK_USER as unknown as SocialSignInSagaContext['user'],
        };

        await step.execute(ctx);

        expect(mediator.user.upsertSocialProfile).not.toHaveBeenCalled();
      });
    });
  });
});

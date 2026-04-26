/**
 * Unit tests for social-sign-in saga steps covering guard branches.
 */
import { EventBus, EventPublisher } from '@nestjs/cqrs';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import { CreateSocialSessionStep } from '@authentication/application/sagas/social-sign-in/steps/social-sign-in-create-session.saga-step';
import { GenerateSocialTokensStep } from '@authentication/application/sagas/social-sign-in/steps/social-sign-in-generate-tokens.saga-step';
import { PublishSocialSignInEventsStep } from '@authentication/application/sagas/social-sign-in/steps/social-sign-in-publish-events.saga-step';
import { ResolveSocialUserStep } from '@authentication/application/sagas/social-sign-in/steps/social-sign-in-resolve-user.saga-step';

import { SocialSignInSagaContext } from '@authentication/application/sagas/social-sign-in/social-sign-in.saga-context';
import { MediatorService } from '@shared/infrastructure/mediator/mediator.service';
import { ISessionContract } from '@user/account/session/domain/session.contract';
import { UserAggregate } from '@user/domain/aggregates/user.aggregate';
import { CredentialAccountModel } from '@user/account/domain/models/credential-account.model';
import { SessionAggregate } from '@user/account/session/domain/session.aggregate';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function baseCtx(overrides: Partial<SocialSignInSagaContext> = {}): SocialSignInSagaContext {
  return {
    email: 'social@example.com',
    displayName: 'Social User',
    provider: 'google',
    providerId: 'google-id-123',
    givenName: 'Social',
    familyName: 'User',
    avatarUrl: null,
    locale: 'en',
    emailVerified: true,
    jobTitle: null,
    rawData: {},
    ...overrides,
  } as SocialSignInSagaContext;
}

function buildUser(): UserAggregate {
  return { uuid: 'user-uuid', id: 42 } as unknown as UserAggregate;
}

function buildCredential(): CredentialAccountModel {
  return { id: 10, accountId: 5, email: 'social@example.com' } as unknown as CredentialAccountModel;
}

function buildSession(): SessionAggregate {
  return { uuid: 'sess-uuid', commit: jest.fn() } as unknown as SessionAggregate;
}

function buildSessionContract(): jest.Mocked<ISessionContract> {
  return {
    persist: jest.fn(),
    persistWithCredential: jest.fn(),
    persistWithSocial: jest.fn(),
    findByTokenHash: jest.fn(),
    archive: jest.fn(),
    archiveAllByAccountId: jest.fn(),
  } as unknown as jest.Mocked<ISessionContract>;
}

// ─── CreateSocialSessionStep ─────────────────────────────────────────────────

describe('CreateSocialSessionStep', () => {
  let step: CreateSocialSessionStep;
  let sessionContract: jest.Mocked<ISessionContract>;

  beforeEach(() => {
    sessionContract = buildSessionContract();
    step = new CreateSocialSessionStep(sessionContract);
  });

  describe('Given the ctx is missing user', () => {
    describe('When execute is called', () => {
      it('Then it throws an error about missing user', async () => {
        await expect(step.execute(baseCtx({ user: undefined }))).rejects.toThrow(
          'ctx.user not set',
        );
      });
    });
  });

  describe('Given the ctx is missing refreshToken', () => {
    describe('When execute is called', () => {
      it('Then it throws an error about missing refreshToken', async () => {
        await expect(
          step.execute(baseCtx({ user: buildUser(), refreshToken: undefined })),
        ).rejects.toThrow('ctx.refreshToken not set');
      });
    });
  });

  describe('Given the ctx is missing socialAccountId', () => {
    describe('When execute is called', () => {
      it('Then it throws an error about missing socialAccountId', async () => {
        await expect(
          step.execute(
            baseCtx({
              user: buildUser(),
              refreshToken: 'token',
              accountId: 5,
              socialAccountId: undefined,
            }),
          ),
        ).rejects.toThrow('ctx.socialAccountId not set');
      });
    });
  });
});

// ─── GenerateSocialTokensStep ────────────────────────────────────────────────

describe('GenerateSocialTokensStep', () => {
  let step: GenerateSocialTokensStep;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;
  let mediator: jest.Mocked<MediatorService>;

  beforeEach(() => {
    jwtService = { signAsync: jest.fn() } as unknown as jest.Mocked<JwtService>;
    configService = {
      get: jest.fn().mockReturnValue('15m'),
      getOrThrow: jest.fn().mockReturnValue('secret'),
    } as unknown as jest.Mocked<ConfigService>;
    mediator = {
      tenant: { getActiveMembership: jest.fn(), getTierLimits: jest.fn() },
      user: { findDisplayNameByUserUUID: jest.fn() },
    } as unknown as jest.Mocked<MediatorService>;

    step = new GenerateSocialTokensStep(jwtService, configService, mediator);
  });

  describe('Given the ctx is missing user', () => {
    describe('When execute is called', () => {
      it('Then it throws an error about missing user', async () => {
        await expect(step.execute(baseCtx({ user: undefined }))).rejects.toThrow(
          'ctx.user not set',
        );
      });
    });
  });

  describe('Given the ctx is missing credential', () => {
    describe('When execute is called', () => {
      it('Then it throws an error about missing credential', async () => {
        await expect(
          step.execute(baseCtx({ user: buildUser(), credential: undefined })),
        ).rejects.toThrow('ctx.credential not set');
      });
    });
  });
});

// ─── PublishSocialSignInEventsStep ───────────────────────────────────────────

describe('PublishSocialSignInEventsStep', () => {
  let step: PublishSocialSignInEventsStep;
  let eventBus: jest.Mocked<EventBus>;
  let eventPublisher: jest.Mocked<EventPublisher>;

  beforeEach(() => {
    eventBus = { publish: jest.fn() } as unknown as jest.Mocked<EventBus>;
    eventPublisher = {
      mergeObjectContext: jest.fn().mockImplementation((obj: unknown) => obj),
    } as unknown as jest.Mocked<EventPublisher>;

    step = new PublishSocialSignInEventsStep(eventBus, eventPublisher);
  });

  describe('Given the ctx is missing user', () => {
    describe('When execute is called', () => {
      it('Then it rejects with an error about missing user', async () => {
        await expect(step.execute(baseCtx({ user: undefined }))).rejects.toThrow(
          'ctx.user not set',
        );
      });
    });
  });

  describe('Given the ctx is missing session', () => {
    describe('When execute is called', () => {
      it('Then it rejects with an error about missing session', async () => {
        await expect(
          step.execute(baseCtx({ user: buildUser(), session: undefined })),
        ).rejects.toThrow('ctx.session not set');
      });
    });
  });
});

// ─── ResolveSocialUserStep ───────────────────────────────────────────────────

describe('ResolveSocialUserStep', () => {
  let step: ResolveSocialUserStep;
  let mediator: jest.Mocked<MediatorService>;

  beforeEach(() => {
    mediator = {
      user: {
        findUserBySocialProvider: jest.fn(),
        findUserByEmail: jest.fn(),
        linkSocialAccount: jest.fn(),
        createUserFromOAuth: jest.fn(),
        existsByUsername: jest.fn(),
      },
    } as unknown as jest.Mocked<MediatorService>;

    step = new ResolveSocialUserStep(mediator);
  });

  describe('Given the user is already linked to the provider', () => {
    describe('When the linked user has a credential', () => {
      beforeEach(() => {
        (mediator.user.findUserBySocialProvider as jest.Mock).mockResolvedValue({
          user: buildUser(),
          social: { accountId: 5, id: 1, uuid: 'social-uuid' },
        });
        (mediator.user.findUserByEmail as jest.Mock).mockResolvedValue({
          user: buildUser(),
          credential: buildCredential(),
        });
      });

      it('Then it sets path to existing-provider', async () => {
        const ctx = baseCtx();
        await step.execute(ctx);
        expect(ctx.path).toBe('existing-provider');
      });
    });
  });

  describe('Given the email already exists with a different auth method', () => {
    describe('When execute is called', () => {
      beforeEach(() => {
        (mediator.user.findUserBySocialProvider as jest.Mock).mockResolvedValue(null);
        (mediator.user.findUserByEmail as jest.Mock).mockResolvedValue({
          user: buildUser(),
          credential: buildCredential(),
        });
        (mediator.user.linkSocialAccount as jest.Mock).mockResolvedValue({
          accountId: 5,
          id: 2,
          uuid: 'social-uuid-2',
        });
      });

      it('Then it sets path to linked-provider', async () => {
        const ctx = baseCtx();
        await step.execute(ctx);
        expect(ctx.path).toBe('linked-provider');
      });
    });
  });

  describe('Given the locale is not a supported language', () => {
    describe('When execute is called for a new user with unsupported locale', () => {
      beforeEach(() => {
        (mediator.user.findUserBySocialProvider as jest.Mock).mockResolvedValue(null);
        (mediator.user.findUserByEmail as jest.Mock).mockResolvedValue(null);
        (mediator.user.existsByUsername as jest.Mock).mockResolvedValue(false);
        (mediator.user.createUserFromOAuth as jest.Mock).mockResolvedValue({
          user: buildUser(),
          credential: buildCredential(),
          social: { accountId: 5, id: 3, uuid: 'social-uuid-3' },
        });
      });

      it('Then it defaults to es locale', async () => {
        const ctx = baseCtx({ locale: 'zh-CN' });
        await step.execute(ctx);

        const createArgs = (mediator.user.createUserFromOAuth as jest.Mock).mock.calls[0][0] as {
          locale: string;
        };
        expect(createArgs.locale).toBe('es');
      });
    });
  });
});

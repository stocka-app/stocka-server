/**
 * Unit tests for sign-in saga steps covering guard branches and compensation.
 */
import { EventBus, EventPublisher } from '@nestjs/cqrs';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import { CreateSignInSessionStep } from '@authentication/application/sagas/sign-in/steps/sign-in-create-session.saga-step';
import { GenerateSignInTokensStep } from '@authentication/application/sagas/sign-in/steps/sign-in-generate-tokens.saga-step';
import { PublishSignInEventsStep } from '@authentication/application/sagas/sign-in/steps/sign-in-publish-events.saga-step';

import { SignInSagaContext } from '@authentication/application/sagas/sign-in/sign-in.saga-context';
import { MediatorService } from '@shared/infrastructure/mediator/mediator.service';
import { ISessionContract } from '@user/account/session/domain/session.contract';
import { UserAggregate } from '@user/domain/models/user.aggregate';
import { CredentialAccountModel } from '@user/account/domain/models/credential-account.model';
import { SessionAggregate } from '@user/account/session/domain/session.aggregate';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function baseCtx(overrides: Partial<SignInSagaContext> = {}): SignInSagaContext {
  return { emailOrUsername: 'test@example.com', password: 'pass', ...overrides } as SignInSagaContext;
}

function buildUser(): UserAggregate {
  return { uuid: 'user-uuid', id: 42 } as unknown as UserAggregate;
}

function buildCredential(): CredentialAccountModel {
  return { id: 10, accountId: 5, email: 'test@example.com' } as unknown as CredentialAccountModel;
}

function buildSession(): SessionAggregate {
  return { uuid: 'sess-uuid', commit: jest.fn() } as unknown as SessionAggregate;
}

// ─── CreateSignInSessionStep ─────────────────────────────────────────────────

describe('CreateSignInSessionStep', () => {
  let step: CreateSignInSessionStep;
  let sessionContract: jest.Mocked<ISessionContract>;

  beforeEach(() => {
    sessionContract = {
      persist: jest.fn(),
      persistWithCredential: jest.fn(),
      persistWithSocial: jest.fn(),
      findByTokenHash: jest.fn(),
      archive: jest.fn(),
      archiveAllByAccountId: jest.fn(),
    } as unknown as jest.Mocked<ISessionContract>;

    step = new CreateSignInSessionStep(sessionContract);
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

  describe('Given the ctx is missing credential', () => {
    describe('When execute is called', () => {
      it('Then it throws an error about missing credential', async () => {
        await expect(
          step.execute(baseCtx({ user: buildUser(), refreshToken: 'token', credential: undefined })),
        ).rejects.toThrow('ctx.credential not set');
      });
    });
  });
});

// ─── GenerateSignInTokensStep ────────────────────────────────────────────────

describe('GenerateSignInTokensStep', () => {
  let step: GenerateSignInTokensStep;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;
  let mediator: jest.Mocked<MediatorService>;

  beforeEach(() => {
    jwtService = { signAsync: jest.fn() } as unknown as jest.Mocked<JwtService>;
    configService = {
      get: jest.fn().mockReturnValue('15m'),
      getOrThrow: jest.fn().mockReturnValue('test-secret'),
    } as unknown as jest.Mocked<ConfigService>;
    mediator = {
      tenant: { getActiveMembership: jest.fn(), getTierLimits: jest.fn() },
      user: { findDisplayNameByUserUUID: jest.fn(), findSocialNameByUserUUID: jest.fn() },
      onboarding: { getOnboardingStatus: jest.fn() },
    } as unknown as jest.Mocked<MediatorService>;

    step = new GenerateSignInTokensStep(jwtService, configService, mediator);
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

// ─── PublishSignInEventsStep ──────────────────────────────────────────────────

describe('PublishSignInEventsStep', () => {
  let step: PublishSignInEventsStep;
  let eventBus: jest.Mocked<EventBus>;
  let eventPublisher: jest.Mocked<EventPublisher>;

  beforeEach(() => {
    eventBus = { publish: jest.fn() } as unknown as jest.Mocked<EventBus>;
    eventPublisher = {
      mergeObjectContext: jest.fn().mockImplementation((obj: unknown) => obj),
    } as unknown as jest.Mocked<EventPublisher>;

    step = new PublishSignInEventsStep(eventBus, eventPublisher);
  });

  describe('Given the ctx is missing user', () => {
    describe('When execute is called', () => {
      it('Then it throws an error about missing user', () => {
        expect(() => step.execute(baseCtx({ user: undefined }))).toThrow('ctx.user not set');
      });
    });
  });

  describe('Given the ctx is missing session', () => {
    describe('When execute is called', () => {
      it('Then it throws an error about missing session', () => {
        expect(() =>
          step.execute(baseCtx({ user: buildUser(), session: undefined })),
        ).toThrow('ctx.session not set');
      });
    });
  });

  describe('Given user and session are set', () => {
    describe('When execute is called', () => {
      it('Then it publishes events and resolves', async () => {
        const session = buildSession();
        await expect(
          step.execute(baseCtx({ user: buildUser(), credential: buildCredential(), session })),
        ).resolves.toBeUndefined();

        expect(eventPublisher.mergeObjectContext).toHaveBeenCalledWith(session);
        expect(eventBus.publish).toHaveBeenCalled();
      });
    });
  });
});

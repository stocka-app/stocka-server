/**
 * Unit tests for refresh-session saga steps covering guard branches.
 */
import { EventBus } from '@nestjs/cqrs';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import { ArchiveOldSessionStep } from '@authentication/application/sagas/refresh-session/steps/refresh-session-archive-session.saga-step';
import { CreateNewSessionStep } from '@authentication/application/sagas/refresh-session/steps/refresh-session-create-session.saga-step';
import { GenerateRefreshTokensStep } from '@authentication/application/sagas/refresh-session/steps/refresh-session-generate-tokens.saga-step';
import { PublishRefreshEventsStep } from '@authentication/application/sagas/refresh-session/steps/refresh-session-publish-events.saga-step';
import { ValidateRefreshTokenStep } from '@authentication/application/sagas/refresh-session/steps/refresh-session-validate-token.saga-step';

import { RefreshSessionSagaContext } from '@authentication/application/sagas/refresh-session/refresh-session.saga-context';
import { MediatorService } from '@shared/infrastructure/mediator/mediator.service';
import { ISessionContract } from '@user/account/session/domain/session.contract';
import { UserAggregate } from '@user/domain/models/user.aggregate';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function baseCtx(overrides: Partial<RefreshSessionSagaContext> = {}): RefreshSessionSagaContext {
  return { refreshToken: 'some-refresh-token', ...overrides } as RefreshSessionSagaContext;
}

function buildUser(): UserAggregate {
  return { uuid: 'user-uuid', id: 42 } as unknown as UserAggregate;
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

// ─── ArchiveOldSessionStep ───────────────────────────────────────────────────

describe('ArchiveOldSessionStep', () => {
  let step: ArchiveOldSessionStep;
  let sessionContract: jest.Mocked<ISessionContract>;

  beforeEach(() => {
    sessionContract = buildSessionContract();
    step = new ArchiveOldSessionStep(sessionContract);
  });

  describe('Given the ctx is missing oldSessionUUID', () => {
    describe('When execute is called', () => {
      it('Then it throws an error about missing oldSessionUUID', async () => {
        await expect(step.execute(baseCtx({ oldSessionUUID: undefined }))).rejects.toThrow(
          'ctx.oldSessionUUID not set',
        );
      });
    });
  });
});

// ─── CreateNewSessionStep ────────────────────────────────────────────────────

describe('CreateNewSessionStep', () => {
  let step: CreateNewSessionStep;
  let sessionContract: jest.Mocked<ISessionContract>;

  beforeEach(() => {
    sessionContract = buildSessionContract();
    step = new CreateNewSessionStep(sessionContract);
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

  describe('Given the ctx is missing newRefreshToken', () => {
    describe('When execute is called', () => {
      it('Then it throws an error about missing newRefreshToken', async () => {
        await expect(
          step.execute(baseCtx({ user: buildUser(), newRefreshToken: undefined })),
        ).rejects.toThrow('ctx.newRefreshToken not set');
      });
    });
  });
});

// ─── GenerateRefreshTokensStep ───────────────────────────────────────────────

describe('GenerateRefreshTokensStep', () => {
  let step: GenerateRefreshTokensStep;
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
      user: {
        findDisplayNameByUserUUID: jest.fn(),
        findSocialNameByUserUUID: jest.fn(),
        findUsernameByUUID: jest.fn(),
      },
      onboarding: { getOnboardingStatus: jest.fn() },
    } as unknown as jest.Mocked<MediatorService>;

    step = new GenerateRefreshTokensStep(jwtService, configService, mediator);
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

  describe('Given the ctx is missing email', () => {
    describe('When execute is called', () => {
      it('Then it throws an error about missing email', async () => {
        await expect(
          step.execute(baseCtx({ user: buildUser(), email: undefined })),
        ).rejects.toThrow('ctx.email not set');
      });
    });
  });
});

// ─── PublishRefreshEventsStep ────────────────────────────────────────────────

describe('PublishRefreshEventsStep', () => {
  let step: PublishRefreshEventsStep;
  let eventBus: jest.Mocked<EventBus>;

  beforeEach(() => {
    eventBus = { publish: jest.fn() } as unknown as jest.Mocked<EventBus>;
    step = new PublishRefreshEventsStep(eventBus);
  });

  describe('Given the ctx is missing oldSessionUUID', () => {
    describe('When execute is called', () => {
      it('Then it throws an error about missing oldSessionUUID', () => {
        expect(() => step.execute(baseCtx({ oldSessionUUID: undefined }))).toThrow(
          'ctx.oldSessionUUID not set',
        );
      });
    });
  });

  describe('Given the ctx is missing newSessionUUID', () => {
    describe('When execute is called', () => {
      it('Then it throws an error about missing newSessionUUID', () => {
        expect(() =>
          step.execute(baseCtx({ oldSessionUUID: 'old-uuid', newSessionUUID: undefined })),
        ).toThrow('ctx.newSessionUUID not set');
      });
    });
  });
});

// ─── ValidateRefreshTokenStep ────────────────────────────────────────────────

describe('ValidateRefreshTokenStep', () => {
  let step: ValidateRefreshTokenStep;
  let sessionContract: jest.Mocked<ISessionContract>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;
  let mediator: jest.Mocked<MediatorService>;

  beforeEach(() => {
    sessionContract = buildSessionContract();
    jwtService = {
      verifyAsync: jest.fn(),
      decode: jest.fn(),
    } as unknown as jest.Mocked<JwtService>;
    configService = {
      getOrThrow: jest.fn().mockReturnValue('secret'),
    } as unknown as jest.Mocked<ConfigService>;
    mediator = {
      user: { findByUUID: jest.fn() },
    } as unknown as jest.Mocked<MediatorService>;

    step = new ValidateRefreshTokenStep(sessionContract, jwtService, configService, mediator);
  });

  describe('Given the session is not found or invalid', () => {
    describe('When execute is called', () => {
      beforeEach(() => {
        sessionContract.findByTokenHash.mockResolvedValue(null);
      });

      it('Then it throws TokenExpiredException', async () => {
        const { TokenExpiredException } =
          await import('@authentication/domain/exceptions/token-expired.exception');
        await expect(step.execute(baseCtx())).rejects.toBeInstanceOf(TokenExpiredException);
      });
    });
  });

  describe('Given the session exists but JWT verification fails', () => {
    describe('When execute is called', () => {
      beforeEach(() => {
        sessionContract.findByTokenHash.mockResolvedValue({
          uuid: 'sess-uuid',
          accountId: 5,
          isValid: jest.fn().mockReturnValue(true),
        } as unknown as ReturnType<typeof sessionContract.findByTokenHash> extends Promise<infer T>
          ? T
          : never);
        jwtService.verifyAsync.mockRejectedValue(new Error('jwt expired'));
      });

      it('Then it throws TokenExpiredException', async () => {
        const { TokenExpiredException } =
          await import('@authentication/domain/exceptions/token-expired.exception');
        await expect(step.execute(baseCtx())).rejects.toBeInstanceOf(TokenExpiredException);
      });
    });
  });

  describe('Given the JWT decodes to an invalid payload', () => {
    describe('When execute is called', () => {
      beforeEach(() => {
        sessionContract.findByTokenHash.mockResolvedValue({
          uuid: 'sess-uuid',
          accountId: 5,
          isValid: jest.fn().mockReturnValue(true),
        } as unknown as ReturnType<typeof sessionContract.findByTokenHash> extends Promise<infer T>
          ? T
          : never);
        jwtService.verifyAsync.mockResolvedValue({});
        jwtService.decode.mockReturnValue(null); // invalid payload
      });

      it('Then it throws TokenExpiredException', async () => {
        const { TokenExpiredException } =
          await import('@authentication/domain/exceptions/token-expired.exception');
        await expect(step.execute(baseCtx())).rejects.toBeInstanceOf(TokenExpiredException);
      });
    });
  });

  describe('Given the user referenced in the JWT does not exist', () => {
    describe('When execute is called', () => {
      beforeEach(() => {
        sessionContract.findByTokenHash.mockResolvedValue({
          uuid: 'sess-uuid',
          accountId: 5,
          isValid: jest.fn().mockReturnValue(true),
        } as unknown as ReturnType<typeof sessionContract.findByTokenHash> extends Promise<infer T>
          ? T
          : never);
        jwtService.verifyAsync.mockResolvedValue({});
        jwtService.decode.mockReturnValue({ sub: 'user-uuid-xyz', email: 'test@test.com' });
        (mediator.user.findByUUID as jest.Mock).mockResolvedValue(null);
      });

      it('Then it throws TokenExpiredException', async () => {
        const { TokenExpiredException } =
          await import('@authentication/domain/exceptions/token-expired.exception');
        await expect(step.execute(baseCtx())).rejects.toBeInstanceOf(TokenExpiredException);
      });
    });
  });
});

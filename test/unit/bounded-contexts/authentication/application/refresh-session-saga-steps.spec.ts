import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EventBus } from '@nestjs/cqrs';
import { ArchiveOldSessionStep } from '@authentication/application/sagas/refresh-session/steps/refresh-session-archive-session.saga-step';
import { CreateNewSessionStep } from '@authentication/application/sagas/refresh-session/steps/refresh-session-create-session.saga-step';
import { GenerateRefreshTokensStep } from '@authentication/application/sagas/refresh-session/steps/refresh-session-generate-tokens.saga-step';
import { PublishRefreshEventsStep } from '@authentication/application/sagas/refresh-session/steps/refresh-session-publish-events.saga-step';
import { ValidateRefreshTokenStep } from '@authentication/application/sagas/refresh-session/steps/refresh-session-validate-token.saga-step';
import { RefreshSessionSagaContext } from '@authentication/application/sagas/refresh-session/refresh-session.saga-context';
import { ISessionContract } from '@authentication/domain/contracts/session.contract';
import { SessionModel } from '@authentication/domain/models/session.model';
import { TokenExpiredException } from '@authentication/domain/exceptions/token-expired.exception';
import { SessionRefreshedEvent } from '@authentication/domain/events/session-refreshed.event';
import { MediatorService } from '@shared/infrastructure/mediator/mediator.service';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { UserMother } from '@test/helpers/object-mother/user.mother';

const VALID_SESSION_UUID = '550e8400-e29b-41d4-a716-446655440000';
const NEW_SESSION_UUID = 'b1b2c3d4-e5f6-7890-abcd-ef1234567891';

function buildValidSession(uuid: string = VALID_SESSION_UUID): SessionModel {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  return SessionModel.reconstitute({ id: 1, uuid, accountId: 1, tokenHash: 'hash', expiresAt });
}

function buildExpiredSession(uuid: string = VALID_SESSION_UUID): SessionModel {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() - 1);
  return SessionModel.reconstitute({ id: 1, uuid, accountId: 1, tokenHash: 'hash', expiresAt });
}

// ─── ArchiveOldSessionStep ───────────────────────────────────────────────────
describe('ArchiveOldSessionStep', () => {
  let step: ArchiveOldSessionStep;
  let sessionContract: jest.Mocked<Pick<ISessionContract, 'archive'>>;

  beforeEach(async () => {
    sessionContract = { archive: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArchiveOldSessionStep,
        { provide: INJECTION_TOKENS.SESSION_CONTRACT, useValue: sessionContract },
      ],
    }).compile();

    step = module.get<ArchiveOldSessionStep>(ArchiveOldSessionStep);
  });

  describe('Given a context with oldSessionUUID set', () => {
    describe('When execute() is called', () => {
      it('Then it archives the old session via the contract', async () => {
        const ctx: RefreshSessionSagaContext = {
          refreshToken: 'tok',
          oldSessionUUID: VALID_SESSION_UUID,
        };
        await step.execute(ctx);
        expect(sessionContract.archive).toHaveBeenCalledWith(VALID_SESSION_UUID);
      });
    });
  });

  describe('Given a context without oldSessionUUID', () => {
    describe('When execute() is called', () => {
      it('Then it throws an invariant violation error', async () => {
        const ctx: RefreshSessionSagaContext = { refreshToken: 'tok' };
        await expect(step.execute(ctx)).rejects.toThrow('ctx.oldSessionUUID not set');
      });
    });
  });
});

// ─── CreateNewSessionStep ─────────────────────────────────────────────────────
describe('CreateNewSessionStep', () => {
  let step: CreateNewSessionStep;
  let sessionContract: jest.Mocked<Pick<ISessionContract, 'persist'>>;

  beforeEach(async () => {
    sessionContract = {
      persist: jest.fn().mockResolvedValue(buildValidSession(NEW_SESSION_UUID)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateNewSessionStep,
        { provide: INJECTION_TOKENS.SESSION_CONTRACT, useValue: sessionContract },
      ],
    }).compile();

    step = module.get<CreateNewSessionStep>(CreateNewSessionStep);
  });

  describe('Given a context with user and newRefreshToken set', () => {
    describe('When execute() is called', () => {
      it('Then it creates a new session and sets ctx.newSessionUUID', async () => {
        const ctx: RefreshSessionSagaContext = {
          refreshToken: 'old-token',
          user: UserMother.create({ id: 1 }) as unknown as RefreshSessionSagaContext['user'],
          newRefreshToken: 'new-refresh-token',
          accountId: 10,
        };
        await step.execute(ctx);
        expect(sessionContract.persist).toHaveBeenCalledTimes(1);
        expect(ctx.newSessionUUID).toBe(NEW_SESSION_UUID);
      });
    });
  });

  describe('Given a context without user', () => {
    describe('When execute() is called', () => {
      it('Then it throws an invariant violation error', async () => {
        const ctx: RefreshSessionSagaContext = {
          refreshToken: 'tok',
          newRefreshToken: 'new-tok',
        };
        await expect(step.execute(ctx)).rejects.toThrow('ctx.user not set');
      });
    });
  });

  describe('Given a context without newRefreshToken', () => {
    describe('When execute() is called', () => {
      it('Then it throws an invariant violation error', async () => {
        const ctx: RefreshSessionSagaContext = {
          refreshToken: 'tok',
          user: UserMother.create({ id: 1 }) as unknown as RefreshSessionSagaContext['user'],
        };
        await expect(step.execute(ctx)).rejects.toThrow('ctx.newRefreshToken not set');
      });
    });
  });

  describe('Given a context without accountId', () => {
    describe('When execute() is called', () => {
      it('Then it throws an invariant violation error', async () => {
        const ctx: RefreshSessionSagaContext = {
          refreshToken: 'tok',
          user: UserMother.create({ id: 1 }) as unknown as RefreshSessionSagaContext['user'],
          newRefreshToken: 'new-tok',
        };
        await expect(step.execute(ctx)).rejects.toThrow('ctx.accountId not set');
      });
    });
  });
});

// ─── GenerateRefreshTokensStep ────────────────────────────────────────────────
describe('GenerateRefreshTokensStep', () => {
  let step: GenerateRefreshTokensStep;
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
      getOrThrow: jest.fn().mockImplementation((key: string) => {
        const map: Record<string, string> = {
          JWT_ACCESS_SECRET: 'access-secret',
          JWT_REFRESH_SECRET: 'refresh-secret',
        };
        return map[key];
      }),
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
        GenerateRefreshTokensStep,
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
        { provide: MediatorService, useValue: mediator },
      ],
    }).compile();

    step = module.get<GenerateRefreshTokensStep>(GenerateRefreshTokensStep);
  });

  describe('Given a context with user set', () => {
    describe('When execute() is called', () => {
      it('Then it generates access and refresh tokens and sets them on ctx', async () => {
        const ctx: RefreshSessionSagaContext = {
          refreshToken: 'old-token',
          user: UserMother.create({ id: 1, uuid: '550e8400-e29b-41d4-a716-446655440002' }),
          email: 'u@t.com',
        };
        await step.execute(ctx);
        expect(ctx.accessToken).toBe('signed-token');
        expect(ctx.newRefreshToken).toBe('signed-token');
        expect(jwtService.signAsync).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Given a context without user', () => {
    describe('When execute() is called', () => {
      it('Then it throws an invariant violation error', async () => {
        const ctx: RefreshSessionSagaContext = { refreshToken: 'tok' };
        await expect(step.execute(ctx)).rejects.toThrow('ctx.user not set');
      });
    });
  });

  describe('Given a context without email', () => {
    describe('When execute() is called', () => {
      it('Then it throws an invariant violation error', async () => {
        const ctx: RefreshSessionSagaContext = {
          refreshToken: 'tok',
          user: UserMother.create({ id: 1 }) as unknown as RefreshSessionSagaContext['user'],
        };
        await expect(step.execute(ctx)).rejects.toThrow('ctx.email not set');
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
          getOrThrow: jest.fn().mockImplementation((key: string) => {
            const map: Record<string, string> = {
              JWT_ACCESS_SECRET: 'access-secret',
              JWT_REFRESH_SECRET: 'refresh-secret',
            };
            return map[key];
          }),
        };

        const newModule: TestingModule = await Test.createTestingModule({
          providers: [
            GenerateRefreshTokensStep,
            { provide: JwtService, useValue: jwtService },
            { provide: ConfigService, useValue: configWithUndefined },
            { provide: MediatorService, useValue: mediator },
          ],
        }).compile();

        const stepWithDefaults =
          newModule.get<GenerateRefreshTokensStep>(GenerateRefreshTokensStep);
        const ctx: RefreshSessionSagaContext = {
          refreshToken: 'old-token',
          user: UserMother.create({ id: 1, uuid: '550e8400-e29b-41d4-a716-446655440002' }),
          email: 'u@t.com',
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

// ─── PublishRefreshEventsStep ─────────────────────────────────────────────────
describe('PublishRefreshEventsStep', () => {
  let step: PublishRefreshEventsStep;
  let eventBus: { publish: jest.Mock };

  beforeEach(async () => {
    eventBus = { publish: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [PublishRefreshEventsStep, { provide: EventBus, useValue: eventBus }],
    }).compile();

    step = module.get<PublishRefreshEventsStep>(PublishRefreshEventsStep);
  });

  describe('Given a context with oldSessionUUID and newSessionUUID', () => {
    describe('When execute() is called', () => {
      it('Then it publishes a SessionRefreshedEvent', async () => {
        const ctx: RefreshSessionSagaContext = {
          refreshToken: 'tok',
          oldSessionUUID: 'old-uuid',
          newSessionUUID: 'new-uuid',
        };
        await step.execute(ctx);
        expect(eventBus.publish).toHaveBeenCalledWith(expect.any(SessionRefreshedEvent));
        const published = eventBus.publish.mock.calls[0][0] as SessionRefreshedEvent;
        expect(published.oldSessionUUID).toBe('old-uuid');
        expect(published.newSessionUUID).toBe('new-uuid');
      });
    });
  });

  describe('Given a context without oldSessionUUID', () => {
    describe('When execute() is called', () => {
      it('Then it throws an invariant violation error', () => {
        const ctx: RefreshSessionSagaContext = {
          refreshToken: 'tok',
          newSessionUUID: 'new-uuid',
        };
        expect(() => step.execute(ctx)).toThrow('ctx.oldSessionUUID not set');
      });
    });
  });

  describe('Given a context without newSessionUUID', () => {
    describe('When execute() is called', () => {
      it('Then it throws an invariant violation error', () => {
        const ctx: RefreshSessionSagaContext = {
          refreshToken: 'tok',
          oldSessionUUID: 'old-uuid',
        };
        expect(() => step.execute(ctx)).toThrow('ctx.newSessionUUID not set');
      });
    });
  });
});

// ─── ValidateRefreshTokenStep ─────────────────────────────────────────────────
describe('ValidateRefreshTokenStep', () => {
  let step: ValidateRefreshTokenStep;
  let sessionContract: jest.Mocked<Pick<ISessionContract, 'findByTokenHash'>>;
  let jwtService: jest.Mocked<Pick<JwtService, 'verifyAsync' | 'decode'>>;
  let configService: { getOrThrow: jest.Mock };
  let mediator: { user: { findByUUID: jest.Mock } };

  const VALID_USER = UserMother.create({ id: 1, uuid: '550e8400-e29b-41d4-a716-446655440001' });

  beforeEach(async () => {
    sessionContract = { findByTokenHash: jest.fn() };
    jwtService = {
      verifyAsync: jest.fn().mockResolvedValue({}),
      decode: jest.fn().mockReturnValue({ sub: 'user-uuid-123', email: 'u@test.com' }),
    };
    configService = {
      getOrThrow: jest.fn().mockReturnValue('jwt-refresh-secret'),
    };
    mediator = { user: { findByUUID: jest.fn() } };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ValidateRefreshTokenStep,
        { provide: INJECTION_TOKENS.SESSION_CONTRACT, useValue: sessionContract },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
        { provide: MediatorService, useValue: mediator },
      ],
    }).compile();

    step = module.get<ValidateRefreshTokenStep>(ValidateRefreshTokenStep);
  });

  describe('Given a valid refresh token with a valid session and existing user', () => {
    beforeEach(() => {
      sessionContract.findByTokenHash.mockResolvedValue(buildValidSession());
      mediator.user.findByUUID.mockResolvedValue(VALID_USER);
    });

    describe('When execute() is called', () => {
      it('Then it sets oldSessionUUID and user on the context', async () => {
        const ctx: RefreshSessionSagaContext = { refreshToken: 'valid.jwt.token' };
        await step.execute(ctx);
        expect(ctx.oldSessionUUID).toBe(VALID_SESSION_UUID);
        expect(ctx.user).toBeDefined();
      });
    });
  });

  describe('Given a refresh token that does not match any session (no session found)', () => {
    beforeEach(() => {
      sessionContract.findByTokenHash.mockResolvedValue(null);
    });

    describe('When execute() is called', () => {
      it('Then it throws TokenExpiredException', async () => {
        const ctx: RefreshSessionSagaContext = { refreshToken: 'invalid.token' };
        await expect(step.execute(ctx)).rejects.toThrow(TokenExpiredException);
      });
    });
  });

  describe('Given a session that is not valid (expired or archived)', () => {
    beforeEach(() => {
      sessionContract.findByTokenHash.mockResolvedValue(buildExpiredSession());
    });

    describe('When execute() is called', () => {
      it('Then it throws TokenExpiredException', async () => {
        const ctx: RefreshSessionSagaContext = { refreshToken: 'expired.token' };
        await expect(step.execute(ctx)).rejects.toThrow(TokenExpiredException);
      });
    });
  });

  describe('Given a session that exists but JWT verification fails', () => {
    beforeEach(() => {
      sessionContract.findByTokenHash.mockResolvedValue(buildValidSession());
      jwtService.verifyAsync.mockRejectedValue(new Error('jwt expired'));
    });

    describe('When execute() is called', () => {
      it('Then it throws TokenExpiredException', async () => {
        const ctx: RefreshSessionSagaContext = { refreshToken: 'tampered.token' };
        await expect(step.execute(ctx)).rejects.toThrow(TokenExpiredException);
      });
    });
  });

  describe('Given a valid session and JWT but the decoded user is not found', () => {
    beforeEach(() => {
      sessionContract.findByTokenHash.mockResolvedValue(buildValidSession());
      jwtService.decode.mockReturnValue({ sub: 'ghost-uuid', email: 'ghost@test.com' });
      mediator.user.findByUUID.mockResolvedValue(null);
    });

    describe('When execute() is called', () => {
      it('Then it throws TokenExpiredException', async () => {
        const ctx: RefreshSessionSagaContext = { refreshToken: 'orphaned.token' };
        await expect(step.execute(ctx)).rejects.toThrow(TokenExpiredException);
      });
    });
  });

  describe('Given a valid session and JWT but the decoded payload is malformed', () => {
    beforeEach(() => {
      sessionContract.findByTokenHash.mockResolvedValue(buildValidSession());
      jwtService.decode.mockReturnValue(null);
    });

    describe('When execute() is called', () => {
      it('Then it throws TokenExpiredException', async () => {
        const ctx: RefreshSessionSagaContext = { refreshToken: 'malformed.token' };
        await expect(step.execute(ctx)).rejects.toThrow(TokenExpiredException);
      });
    });
  });
});

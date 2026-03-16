import { Test, TestingModule } from '@nestjs/testing';
import { RefreshSessionSaga } from '@authentication/application/sagas/refresh-session/refresh-session.saga';
import { RefreshSessionSagaContext } from '@authentication/application/sagas/refresh-session/refresh-session.saga-context';
import {
  ValidateRefreshTokenStep,
  ArchiveOldSessionStep,
  GenerateRefreshTokensStep,
  CreateNewSessionStep,
  PublishRefreshEventsStep,
} from '@authentication/application/sagas/refresh-session/steps';
import { TokenExpiredException } from '@authentication/domain/exceptions/token-expired.exception';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { UserMother } from '@test/helpers/object-mother/user.mother';

describe('RefreshSessionSaga', () => {
  let saga: RefreshSessionSaga;
  let validateToken: { execute: jest.Mock };
  let archiveOldSession: { execute: jest.Mock };
  let generateTokens: { execute: jest.Mock };
  let createNewSession: { execute: jest.Mock };
  let publishEvents: { execute: jest.Mock };
  let uow: { begin: jest.Mock; commit: jest.Mock; rollback: jest.Mock; isActive: jest.Mock };

  const mockUser = UserMother.create({
    id: 7,
    uuid: '550e8400-e29b-41d4-a716-446655440007',
  });

  const baseSagaContext: RefreshSessionSagaContext = {
    refreshToken: 'valid-refresh-token',
  };

  beforeEach(async () => {
    const mockValidateToken = {
      execute: jest.fn().mockImplementation((ctx: RefreshSessionSagaContext) => {
        ctx.oldSessionUUID = 'old-session-uuid-001';
        ctx.user = mockUser;
      }),
    };
    const mockArchiveOldSession = { execute: jest.fn() };
    const mockGenerateTokens = {
      execute: jest.fn().mockImplementation((ctx: RefreshSessionSagaContext) => {
        ctx.accessToken = 'new-access-token';
        ctx.newRefreshToken = 'new-refresh-token';
      }),
    };
    const mockCreateNewSession = {
      execute: jest.fn().mockImplementation((ctx: RefreshSessionSagaContext) => {
        ctx.newSessionUUID = 'new-session-uuid-002';
      }),
    };
    const mockPublishEvents = { execute: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefreshSessionSaga,
        { provide: ValidateRefreshTokenStep, useValue: mockValidateToken },
        { provide: ArchiveOldSessionStep, useValue: mockArchiveOldSession },
        { provide: GenerateRefreshTokensStep, useValue: mockGenerateTokens },
        { provide: CreateNewSessionStep, useValue: mockCreateNewSession },
        { provide: PublishRefreshEventsStep, useValue: mockPublishEvents },
        {
          provide: INJECTION_TOKENS.UNIT_OF_WORK,
          useValue: {
            begin: jest.fn(),
            commit: jest.fn(),
            rollback: jest.fn(),
            isActive: jest.fn().mockReturnValue(false),
          },
        },
      ],
    }).compile();

    saga = module.get(RefreshSessionSaga);
    validateToken = module.get(ValidateRefreshTokenStep);
    archiveOldSession = module.get(ArchiveOldSessionStep);
    generateTokens = module.get(GenerateRefreshTokensStep);
    createNewSession = module.get(CreateNewSessionStep);
    publishEvents = module.get(PublishRefreshEventsStep);
    uow = module.get(INJECTION_TOKENS.UNIT_OF_WORK);
  });

  describe('Given a customer with a valid refresh token', () => {
    describe('When they request a new access token', () => {
      it('Then all steps are called in order and the transaction commits before publishing events', async () => {
        const ctx = await saga.run({ ...baseSagaContext });

        expect(uow.begin).toHaveBeenCalledTimes(1);
        expect(uow.commit).toHaveBeenCalledTimes(1);
        expect(uow.rollback).not.toHaveBeenCalled();

        expect(validateToken.execute).toHaveBeenCalledTimes(1);
        expect(archiveOldSession.execute).toHaveBeenCalledTimes(1);
        expect(generateTokens.execute).toHaveBeenCalledTimes(1);
        expect(createNewSession.execute).toHaveBeenCalledTimes(1);
        expect(publishEvents.execute).toHaveBeenCalledTimes(1);

        expect(ctx.accessToken).toBe('new-access-token');
        expect(ctx.newRefreshToken).toBe('new-refresh-token');
        expect(ctx.newSessionUUID).toBe('new-session-uuid-002');
      });
    });
  });

  describe('Given a customer submits an expired or invalid refresh token', () => {
    describe('When the validate step detects the token is not valid', () => {
      it('Then the saga rolls back and no sessions are modified in the DB', async () => {
        validateToken.execute.mockRejectedValue(new TokenExpiredException());

        await expect(saga.run({ ...baseSagaContext })).rejects.toThrow(TokenExpiredException);

        expect(uow.rollback).toHaveBeenCalledTimes(1);
        expect(uow.commit).not.toHaveBeenCalled();
        expect(archiveOldSession.execute).not.toHaveBeenCalled();
        expect(createNewSession.execute).not.toHaveBeenCalled();
        expect(publishEvents.execute).not.toHaveBeenCalled();
      });
    });
  });

  describe('Given a DB failure while archiving the old session', () => {
    describe('When the archive step throws mid-transaction', () => {
      it('Then the transaction is rolled back and no new session is created', async () => {
        archiveOldSession.execute.mockRejectedValue(new Error('Deadlock detected'));

        await expect(saga.run({ ...baseSagaContext })).rejects.toThrow('Deadlock detected');

        expect(uow.rollback).toHaveBeenCalledTimes(1);
        expect(uow.commit).not.toHaveBeenCalled();
        expect(generateTokens.execute).not.toHaveBeenCalled();
        expect(createNewSession.execute).not.toHaveBeenCalled();
      });
    });
  });

  describe('Given a DB failure during new session creation', () => {
    describe('When the create-new-session step fails mid-transaction', () => {
      it('Then the old session archive is also rolled back — the customer keeps their original session', async () => {
        createNewSession.execute.mockRejectedValue(new Error('Session insert failed'));

        await expect(saga.run({ ...baseSagaContext })).rejects.toThrow('Session insert failed');

        expect(validateToken.execute).toHaveBeenCalledTimes(1);
        expect(archiveOldSession.execute).toHaveBeenCalledTimes(1);
        expect(generateTokens.execute).toHaveBeenCalledTimes(1);
        expect(createNewSession.execute).toHaveBeenCalledTimes(1);

        expect(uow.rollback).toHaveBeenCalledTimes(1);
        expect(uow.commit).not.toHaveBeenCalled();
        expect(publishEvents.execute).not.toHaveBeenCalled();
      });
    });
  });

  describe('Given the event bus is unavailable after the token rotation completes', () => {
    describe('When the publish-events step throws', () => {
      it('Then the error is swallowed and the customer still receives their new tokens', async () => {
        publishEvents.execute.mockRejectedValue(new Error('EventBus down'));

        const ctx = await saga.run({ ...baseSagaContext });

        expect(uow.commit).toHaveBeenCalledTimes(1);
        expect(uow.rollback).not.toHaveBeenCalled();
        expect(ctx.accessToken).toBe('new-access-token');
        expect(ctx.newRefreshToken).toBe('new-refresh-token');
      });
    });
  });

  describe('Step execution order', () => {
    it('should call steps in the exact declared order', async () => {
      const callOrder: string[] = [];

      validateToken.execute.mockImplementation((ctx: RefreshSessionSagaContext) => {
        callOrder.push('validate-refresh-token');
        ctx.oldSessionUUID = 'old-uuid';
        ctx.user = mockUser;
      });
      archiveOldSession.execute.mockImplementation(() => {
        callOrder.push('archive-old-session');
      });
      generateTokens.execute.mockImplementation((ctx: RefreshSessionSagaContext) => {
        callOrder.push('generate-new-tokens');
        ctx.accessToken = 'tok';
        ctx.newRefreshToken = 'tok';
      });
      createNewSession.execute.mockImplementation((ctx: RefreshSessionSagaContext) => {
        callOrder.push('create-new-session');
        ctx.newSessionUUID = 'new-uuid';
      });
      publishEvents.execute.mockImplementation(() => {
        callOrder.push('publish-events');
      });

      await saga.run({ ...baseSagaContext });

      expect(callOrder).toEqual([
        'validate-refresh-token',
        'archive-old-session',
        'generate-new-tokens',
        'create-new-session',
        'publish-events',
      ]);
    });
  });

  describe('DB commit happens before event publishing', () => {
    it('should commit before firing SessionRefreshedEvent', async () => {
      const callOrder: string[] = [];

      uow.commit.mockImplementation(() => {
        callOrder.push('commit');
        return Promise.resolve();
      });
      publishEvents.execute.mockImplementation(() => {
        callOrder.push('publish-events');
        return Promise.resolve();
      });

      await saga.run({ ...baseSagaContext });

      expect(callOrder.indexOf('commit')).toBeLessThan(callOrder.indexOf('publish-events'));
    });
  });

  describe('execute() — Result wrapper', () => {
    describe('Given the saga completes successfully', () => {
      it('Then it returns ok with the new access and refresh tokens', async () => {
        const result = await saga.execute({ ...baseSagaContext });

        expect(result.isOk()).toBe(true);
        const output = result._unsafeUnwrap();
        expect(output.accessToken).toBe('new-access-token');
        expect(output.refreshToken).toBe('new-refresh-token');
      });
    });

    describe('Given the token is expired (DomainException)', () => {
      it('Then it returns err with TokenExpiredException', async () => {
        validateToken.execute.mockRejectedValue(new TokenExpiredException());

        const result = await saga.execute({ ...baseSagaContext });

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(TokenExpiredException);
      });
    });

    describe('Given an infrastructure error is thrown', () => {
      it('Then it re-throws without wrapping in Result', async () => {
        createNewSession.execute.mockRejectedValue(new Error('Hard DB failure'));

        await expect(saga.execute({ ...baseSagaContext })).rejects.toThrow('Hard DB failure');
      });
    });

    describe('Given all steps complete but the generate-tokens step did not populate the context', () => {
      it('Then it re-throws the invariant violation error', async () => {
        generateTokens.execute.mockImplementation(() => {
          // intentionally does not set ctx.accessToken or ctx.newRefreshToken
        });

        await expect(saga.execute({ ...baseSagaContext })).rejects.toThrow(
          'RefreshSessionSaga completed without required output fields',
        );
      });
    });
  });
});

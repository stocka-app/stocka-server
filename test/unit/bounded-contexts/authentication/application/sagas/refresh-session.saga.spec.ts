/**
 * Unit tests for RefreshSessionSaga orchestrator — covers DomainException error path.
 */
import { RefreshSessionSaga } from '@authentication/application/sagas/refresh-session/refresh-session.saga';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { IUnitOfWork } from '@shared/domain/contracts/unit-of-work.contract';
import { RefreshSessionSagaContext } from '@authentication/application/sagas/refresh-session/refresh-session.saga-context';

// ─── Helpers ─────────────────────────────────────────────────────────────────

class TestDomainException extends DomainException {
  constructor() {
    super('TEST_ERROR', 'test domain error');
  }
}

function buildCtx(): RefreshSessionSagaContext {
  return { refreshToken: 'some-refresh-token' } as RefreshSessionSagaContext;
}

function buildUow(): jest.Mocked<IUnitOfWork> {
  return {
    begin: jest.fn().mockResolvedValue(undefined),
    commit: jest.fn().mockResolvedValue(undefined),
    rollback: jest.fn().mockResolvedValue(undefined),
    isActive: jest.fn().mockReturnValue(false),
    getManager: jest.fn(),
    runIsolated: jest.fn(),
  } as unknown as jest.Mocked<IUnitOfWork>;
}

function buildNoop(): { execute: jest.Mock; compensate: jest.Mock } {
  return {
    execute: jest.fn().mockResolvedValue(undefined),
    compensate: jest.fn().mockResolvedValue(undefined),
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('RefreshSessionSaga', () => {
  let uow: jest.Mocked<IUnitOfWork>;

  beforeEach(() => {
    uow = buildUow();
  });

  describe('Given the saga run throws a DomainException', () => {
    describe('When execute is called', () => {
      it('Then it returns an err result wrapping the DomainException', async () => {
        const saga = new RefreshSessionSaga(
          uow,
          buildNoop() as never,
          buildNoop() as never,
          buildNoop() as never,
          buildNoop() as never,
          buildNoop() as never,
        );

        jest.spyOn(saga as unknown as { run: jest.Mock }, 'run').mockRejectedValue(
          new TestDomainException(),
        );

        const result = await saga.execute(buildCtx());

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(DomainException);
      });
    });
  });

  describe('Given the saga run throws a non-domain error', () => {
    describe('When execute is called', () => {
      it('Then it rethrows the non-domain error', async () => {
        const saga = new RefreshSessionSaga(
          uow,
          buildNoop() as never,
          buildNoop() as never,
          buildNoop() as never,
          buildNoop() as never,
          buildNoop() as never,
        );

        jest.spyOn(saga as unknown as { run: jest.Mock }, 'run').mockRejectedValue(
          new Error('Unexpected DB failure'),
        );

        await expect(saga.execute(buildCtx())).rejects.toThrow('Unexpected DB failure');
      });
    });
  });

  describe('Given the saga run completes successfully', () => {
    describe('When execute is called', () => {
      it('Then it returns an ok result with the refresh output', async () => {
        const saga = new RefreshSessionSaga(
          uow,
          buildNoop() as never,
          buildNoop() as never,
          buildNoop() as never,
          buildNoop() as never,
          buildNoop() as never,
        );

        const completedCtx: Partial<RefreshSessionSagaContext> = {
          accessToken: 'new-access-token',
          newRefreshToken: 'new-refresh-token',
        };

        jest.spyOn(saga as unknown as { run: jest.Mock }, 'run').mockResolvedValue(
          completedCtx as RefreshSessionSagaContext,
        );

        const result = await saga.execute(buildCtx());

        expect(result.isOk()).toBe(true);
      });
    });
  });
});

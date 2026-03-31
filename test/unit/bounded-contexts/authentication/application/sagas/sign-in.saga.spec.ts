/**
 * Unit tests for SignInSaga orchestrator — covers DomainException error path.
 *
 * Strategy: spy on the protected `run()` method from the Saga base class to
 * isolate the `execute()` catch-branch without exercising full saga machinery.
 */
import { SignInSaga } from '@authentication/application/sagas/sign-in/sign-in.saga';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { IUnitOfWork } from '@shared/domain/contracts/unit-of-work.contract';
import { SignInSagaContext } from '@authentication/application/sagas/sign-in/sign-in.saga-context';
import { UserAggregate } from '@user/domain/models/user.aggregate';
import { CredentialAccountModel } from '@user/account/domain/models/credential-account.model';

// ─── Helpers ─────────────────────────────────────────────────────────────────

class TestDomainException extends DomainException {
  constructor() {
    super('TEST_ERROR', 'test domain error');
  }
}

function buildCtx(): SignInSagaContext {
  return {
    email: 'test@example.com',
    password: 'Password1!',
    ipAddress: '127.0.0.1',
  } as SignInSagaContext;
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

describe('SignInSaga', () => {
  let uow: jest.Mocked<IUnitOfWork>;

  beforeEach(() => {
    uow = buildUow();
  });

  describe('Given the saga run throws a DomainException', () => {
    describe('When execute is called', () => {
      it('Then it returns an err result wrapping the DomainException', async () => {
        const saga = new SignInSaga(
          uow,
          buildNoop() as never,
          buildNoop() as never,
          buildNoop() as never,
          buildNoop() as never,
        );

        // Spy on run() to avoid full saga machinery
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
        const saga = new SignInSaga(
          uow,
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
      it('Then it returns an ok result with the output fields', async () => {
        const saga = new SignInSaga(
          uow,
          buildNoop() as never,
          buildNoop() as never,
          buildNoop() as never,
          buildNoop() as never,
        );

        const completedCtx: Partial<SignInSagaContext> = {
          user: { uuid: 'u1' } as UserAggregate,
          credential: { email: 'test@example.com' } as CredentialAccountModel,
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
          username: 'testuser',
        };

        jest.spyOn(saga as unknown as { run: jest.Mock }, 'run').mockResolvedValue(
          completedCtx as SignInSagaContext,
        );

        const result = await saga.execute(buildCtx());

        expect(result.isOk()).toBe(true);
      });
    });
  });
});

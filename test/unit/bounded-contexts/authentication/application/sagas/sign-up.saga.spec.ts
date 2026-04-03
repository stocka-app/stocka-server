/**
 * Unit tests for SignUpSaga orchestrator — covers DomainException error path.
 */
import { SignUpSaga } from '@authentication/application/sagas/sign-up/sign-up.saga';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { IUnitOfWork } from '@shared/domain/contracts/unit-of-work.contract';
import { SignUpSagaContext } from '@authentication/application/sagas/sign-up/sign-up.saga-context';
import { UserAggregate } from '@user/domain/models/user.aggregate';
import { CredentialAccountModel } from '@user/account/domain/models/credential-account.model';

// ─── Helpers ─────────────────────────────────────────────────────────────────

class TestDomainException extends DomainException {
  constructor() {
    super('TEST_ERROR', 'test domain error');
  }
}

function buildCtx(): SignUpSagaContext {
  return {
    email: 'test@example.com',
    password: 'Password1!',
  } as SignUpSagaContext;
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

describe('SignUpSaga', () => {
  let uow: jest.Mocked<IUnitOfWork>;

  beforeEach(() => {
    uow = buildUow();
  });

  describe('Given the saga run throws a DomainException', () => {
    describe('When execute is called', () => {
      it('Then it returns an err result wrapping the DomainException', async () => {
        const saga = new SignUpSaga(
          uow,
          buildNoop() as never,
          buildNoop() as never,
          buildNoop() as never,
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
        const saga = new SignUpSaga(
          uow,
          buildNoop() as never,
          buildNoop() as never,
          buildNoop() as never,
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
      it('Then it returns an ok result with the output fields', async () => {
        const saga = new SignUpSaga(
          uow,
          buildNoop() as never,
          buildNoop() as never,
          buildNoop() as never,
          buildNoop() as never,
          buildNoop() as never,
          buildNoop() as never,
          buildNoop() as never,
          buildNoop() as never,
        );

        const completedCtx: Partial<SignUpSagaContext> = {
          user: { uuid: 'u1' } as UserAggregate,
          credential: { email: 'test@example.com' } as CredentialAccountModel,
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
          username: 'testuser',
          emailSent: true,
        };

        jest.spyOn(saga as unknown as { run: jest.Mock }, 'run').mockResolvedValue(
          completedCtx as SignUpSagaContext,
        );

        const result = await saga.execute(buildCtx());

        expect(result.isOk()).toBe(true);
      });
    });
  });

  describe('Given the saga run resolves but a step failed to populate required output fields', () => {
    describe('When execute is called', () => {
      it('Then it throws an internal error about missing output fields', async () => {
        const saga = new SignUpSaga(
          uow,
          buildNoop() as never,
          buildNoop() as never,
          buildNoop() as never,
          buildNoop() as never,
          buildNoop() as never,
          buildNoop() as never,
          buildNoop() as never,
          buildNoop() as never,
        );

        jest.spyOn(saga as unknown as { run: jest.Mock }, 'run').mockResolvedValue(
          buildCtx() as SignUpSagaContext, // no user / credential / tokens populated
        );

        await expect(saga.execute(buildCtx())).rejects.toThrow(
          'SignUpSaga completed without required output fields',
        );
      });
    });
  });
});

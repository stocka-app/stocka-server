import { SocialSignInSaga } from '@authentication/application/sagas/social-sign-in/social-sign-in.saga';
import { IUnitOfWork } from '@shared/domain/contracts/unit-of-work.contract';
import { SocialSignInSagaContext } from '@authentication/application/sagas/social-sign-in/social-sign-in.saga-context';
import { UserAggregate } from '@user/domain/models/user.aggregate';
import { CredentialAccountModel } from '@user/account/domain/models/credential-account.model';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildCtx(): SocialSignInSagaContext {
  return {
    email: 'social@example.com',
    provider: 'google',
    providerId: 'google-id-123',
  } as SocialSignInSagaContext;
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

describe('SocialSignInSaga', () => {
  let uow: jest.Mocked<IUnitOfWork>;

  beforeEach(() => {
    uow = buildUow();
  });

  describe('Given the saga run throws a non-domain error', () => {
    describe('When execute is called', () => {
      it('Then it rethrows the non-domain error', async () => {
        const saga = new SocialSignInSaga(
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
      it('Then it returns an ok result with the social sign-in output', async () => {
        const saga = new SocialSignInSaga(
          uow,
          buildNoop() as never,
          buildNoop() as never,
          buildNoop() as never,
          buildNoop() as never,
          buildNoop() as never,
        );

        const completedCtx: Partial<SocialSignInSagaContext> = {
          user: { uuid: 'u1' } as UserAggregate,
          credential: { email: 'social@example.com' } as CredentialAccountModel,
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
        };

        jest.spyOn(saga as unknown as { run: jest.Mock }, 'run').mockResolvedValue(
          completedCtx as SocialSignInSagaContext,
        );

        const result = await saga.execute(buildCtx());

        expect(result.isOk()).toBe(true);
      });
    });
  });
});

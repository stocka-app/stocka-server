import { Test, TestingModule } from '@nestjs/testing';
import { ResetPasswordSaga } from '@authentication/application/sagas/reset-password/reset-password.saga';
import { ResetPasswordSagaContext } from '@authentication/application/sagas/reset-password/reset-password.saga-context';
import {
  ValidateResetTokenStep,
  HashNewPasswordStep,
  MarkTokenUsedStep,
  ArchiveUserSessionsStep,
  PublishResetPasswordEventsStep,
} from '@authentication/application/sagas/reset-password/steps';
import { TokenExpiredException } from '@authentication/domain/exceptions/token-expired.exception';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

describe('ResetPasswordSaga', () => {
  let saga: ResetPasswordSaga;
  let validateToken: { execute: jest.Mock };
  let hashPassword: { execute: jest.Mock };
  let markTokenUsed: { execute: jest.Mock };
  let archiveSessions: { execute: jest.Mock };
  let publishEvents: { execute: jest.Mock };
  let uow: { begin: jest.Mock; commit: jest.Mock; rollback: jest.Mock; isActive: jest.Mock };

  const baseSagaContext: ResetPasswordSagaContext = {
    token: 'valid-reset-token',
    newPassword: 'NewSecurePass!123',
  };

  beforeEach(async () => {
    const mockValidateToken = {
      execute: jest.fn().mockImplementation((ctx: ResetPasswordSagaContext) => {
        ctx.resetToken = { userId: 99, markAsUsed: jest.fn(), commit: jest.fn() } as unknown as ResetPasswordSagaContext['resetToken'];
      }),
    };
    const mockHashPassword = {
      execute: jest.fn().mockImplementation((ctx: ResetPasswordSagaContext) => {
        ctx.newPasswordHash = 'hashed-password-bcrypt';
      }),
    };
    const mockMarkTokenUsed = { execute: jest.fn() };
    const mockArchiveSessions = { execute: jest.fn() };
    const mockPublishEvents = { execute: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResetPasswordSaga,
        { provide: ValidateResetTokenStep, useValue: mockValidateToken },
        { provide: HashNewPasswordStep, useValue: mockHashPassword },
        { provide: MarkTokenUsedStep, useValue: mockMarkTokenUsed },
        { provide: ArchiveUserSessionsStep, useValue: mockArchiveSessions },
        { provide: PublishResetPasswordEventsStep, useValue: mockPublishEvents },
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

    saga = module.get(ResetPasswordSaga);
    validateToken = module.get(ValidateResetTokenStep);
    hashPassword = module.get(HashNewPasswordStep);
    markTokenUsed = module.get(MarkTokenUsedStep);
    archiveSessions = module.get(ArchiveUserSessionsStep);
    publishEvents = module.get(PublishResetPasswordEventsStep);
    uow = module.get(INJECTION_TOKENS.UNIT_OF_WORK);
  });

  describe('Given a customer with a valid reset token and a strong new password', () => {
    describe('When the saga runs successfully', () => {
      it('Then it calls all steps in order and commits the transaction before publishing events', async () => {
        await saga.run({ ...baseSagaContext });

        expect(uow.begin).toHaveBeenCalledTimes(1);
        expect(uow.commit).toHaveBeenCalledTimes(1);
        expect(uow.rollback).not.toHaveBeenCalled();

        expect(validateToken.execute).toHaveBeenCalledTimes(1);
        expect(hashPassword.execute).toHaveBeenCalledTimes(1);
        expect(markTokenUsed.execute).toHaveBeenCalledTimes(1);
        expect(archiveSessions.execute).toHaveBeenCalledTimes(1);
        expect(publishEvents.execute).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Given the token is expired or already used', () => {
    describe('When the validate step throws a domain exception', () => {
      it('Then the transaction is rolled back and no writes happen', async () => {
        validateToken.execute.mockRejectedValue(new TokenExpiredException());

        await expect(saga.run({ ...baseSagaContext })).rejects.toBeInstanceOf(TokenExpiredException);

        expect(uow.begin).toHaveBeenCalledTimes(1);
        expect(uow.rollback).toHaveBeenCalledTimes(1);
        expect(uow.commit).not.toHaveBeenCalled();

        expect(hashPassword.execute).not.toHaveBeenCalled();
        expect(markTokenUsed.execute).not.toHaveBeenCalled();
        expect(archiveSessions.execute).not.toHaveBeenCalled();
        expect(publishEvents.execute).not.toHaveBeenCalled();
      });
    });
  });

  describe('Given a DB failure while marking the token as used', () => {
    describe('When the mark-token-used step throws mid-transaction', () => {
      it('Then all writes are rolled back and sessions are not archived', async () => {
        markTokenUsed.execute.mockRejectedValue(new Error('DB write failed'));

        await expect(saga.run({ ...baseSagaContext })).rejects.toThrow('DB write failed');

        expect(uow.rollback).toHaveBeenCalledTimes(1);
        expect(uow.commit).not.toHaveBeenCalled();
        expect(archiveSessions.execute).not.toHaveBeenCalled();
        expect(publishEvents.execute).not.toHaveBeenCalled();
      });
    });
  });

  describe('Given a DB failure while archiving sessions', () => {
    describe('When the archive-sessions step throws mid-transaction', () => {
      it('Then the transaction is rolled back including the token mark', async () => {
        archiveSessions.execute.mockRejectedValue(new Error('Session archive failed'));

        await expect(saga.run({ ...baseSagaContext })).rejects.toThrow('Session archive failed');

        expect(uow.rollback).toHaveBeenCalledTimes(1);
        expect(uow.commit).not.toHaveBeenCalled();
        expect(publishEvents.execute).not.toHaveBeenCalled();
      });
    });
  });

  describe('Given the event bus is down after the DB commit', () => {
    describe('When the publish-events step throws', () => {
      it('Then the error is swallowed and the password reset succeeds (fire-and-forget guarantee)', async () => {
        publishEvents.execute.mockRejectedValue(new Error('EventBus unavailable'));

        await expect(saga.run({ ...baseSagaContext })).resolves.toBeDefined();

        expect(uow.commit).toHaveBeenCalledTimes(1);
        expect(uow.rollback).not.toHaveBeenCalled();
      });
    });
  });

  describe('Step execution order', () => {
    it('should call validate → hash → mark-used → archive → publish in declared order', async () => {
      const callOrder: string[] = [];

      validateToken.execute.mockImplementation((ctx: ResetPasswordSagaContext) => {
        callOrder.push('validate-token');
        ctx.resetToken = { userId: 99 } as unknown as ResetPasswordSagaContext['resetToken'];
      });
      hashPassword.execute.mockImplementation((ctx: ResetPasswordSagaContext) => {
        callOrder.push('hash-password');
        ctx.newPasswordHash = 'hash';
      });
      markTokenUsed.execute.mockImplementation(() => callOrder.push('mark-token-used'));
      archiveSessions.execute.mockImplementation(() => callOrder.push('archive-sessions'));
      publishEvents.execute.mockImplementation(() => callOrder.push('publish-events'));

      await saga.run({ ...baseSagaContext });

      expect(callOrder).toEqual([
        'validate-token',
        'hash-password',
        'mark-token-used',
        'archive-sessions',
        'publish-events',
      ]);
    });
  });

  describe('DB commit happens before event publishing', () => {
    it('should commit the transaction before firing any domain or integration events', async () => {
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

      const commitIndex = callOrder.indexOf('commit');
      const publishIndex = callOrder.indexOf('publish-events');
      expect(commitIndex).toBeGreaterThanOrEqual(0);
      expect(publishIndex).toBeGreaterThan(commitIndex);
    });
  });

  describe('execute() — Result wrapper', () => {
    describe('Given the saga completes successfully', () => {
      it('Then it returns ok with the success message', async () => {
        const result = await saga.execute({ ...baseSagaContext });

        expect(result.isOk()).toBe(true);
        const output = result._unsafeUnwrap();
        expect(output.message).toBe('Password has been reset successfully');
      });
    });

    describe('Given the token is expired', () => {
      it('Then it returns err wrapping the TokenExpiredException', async () => {
        validateToken.execute.mockRejectedValue(new TokenExpiredException());

        const result = await saga.execute({ ...baseSagaContext });

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(TokenExpiredException);
      });
    });

    describe('Given an infrastructure error is thrown', () => {
      it('Then it re-throws the error without wrapping in Result', async () => {
        markTokenUsed.execute.mockRejectedValue(new Error('Hard DB failure'));

        await expect(saga.execute({ ...baseSagaContext })).rejects.toThrow('Hard DB failure');
      });
    });
  });
});

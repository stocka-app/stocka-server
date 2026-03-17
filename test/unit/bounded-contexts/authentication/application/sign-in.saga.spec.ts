import { Test, TestingModule } from '@nestjs/testing';
import { SignInSaga } from '@authentication/application/sagas/sign-in/sign-in.saga';
import { SignInSagaContext } from '@authentication/application/sagas/sign-in/sign-in.saga-context';
import {
  ValidateCredentialsStep,
  GenerateSignInTokensStep,
  CreateSignInSessionStep,
  PublishSignInEventsStep,
} from '@authentication/application/sagas/sign-in/steps';
import { InvalidCredentialsException } from '@authentication/domain/exceptions/invalid-credentials.exception';
import { AccountDeactivatedException } from '@authentication/domain/exceptions/account-deactivated.exception';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { UserMother } from '@test/helpers/object-mother/user.mother';
import { IPersistedUserView } from '@shared/domain/contracts/user-view.contract';

describe('SignInSaga', () => {
  let saga: SignInSaga;
  let validateCredentials: { execute: jest.Mock };
  let generateTokens: { execute: jest.Mock };
  let createSession: { execute: jest.Mock };
  let publishEvents: { execute: jest.Mock };
  let uow: { begin: jest.Mock; commit: jest.Mock; rollback: jest.Mock; isActive: jest.Mock };

  const mockUser = UserMother.create({
    id: 1,
    uuid: '550e8400-e29b-41d4-a716-446655440001',
    email: 'ana@example.com',
    username: 'anatorres',
  }) as unknown as IPersistedUserView;

  const mockSession = { uuid: 'session-uuid-001', commit: jest.fn(), userId: 1 };

  const baseSagaContext: SignInSagaContext = {
    emailOrUsername: 'ana@example.com',
    password: 'SecurePass1',
  };

  beforeEach(async () => {
    const mockValidateCredentials = {
      execute: jest.fn().mockImplementation((ctx: SignInSagaContext) => {
        ctx.user = mockUser;
      }),
    };
    const mockGenerateTokens = {
      execute: jest.fn().mockImplementation((ctx: SignInSagaContext) => {
        ctx.accessToken = 'mock-access-token';
        ctx.refreshToken = 'mock-refresh-token';
      }),
    };
    const mockCreateSession = {
      execute: jest.fn().mockImplementation((ctx: SignInSagaContext) => {
        ctx.session = mockSession as unknown as SignInSagaContext['session'];
      }),
    };
    const mockPublishEvents = { execute: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SignInSaga,
        { provide: ValidateCredentialsStep, useValue: mockValidateCredentials },
        { provide: GenerateSignInTokensStep, useValue: mockGenerateTokens },
        { provide: CreateSignInSessionStep, useValue: mockCreateSession },
        { provide: PublishSignInEventsStep, useValue: mockPublishEvents },
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

    saga = module.get(SignInSaga);
    validateCredentials = module.get(ValidateCredentialsStep);
    generateTokens = module.get(GenerateSignInTokensStep);
    createSession = module.get(CreateSignInSessionStep);
    publishEvents = module.get(PublishSignInEventsStep);
    uow = module.get(INJECTION_TOKENS.UNIT_OF_WORK);
  });

  describe('Given a customer with valid credentials', () => {
    describe('When the saga runs successfully', () => {
      it('Then it calls all steps in order and commits the transaction before publishing events', async () => {
        await saga.run({ ...baseSagaContext });

        expect(uow.begin).toHaveBeenCalledTimes(1);
        expect(uow.commit).toHaveBeenCalledTimes(1);
        expect(uow.rollback).not.toHaveBeenCalled();

        expect(validateCredentials.execute).toHaveBeenCalledTimes(1);
        expect(generateTokens.execute).toHaveBeenCalledTimes(1);
        expect(createSession.execute).toHaveBeenCalledTimes(1);
        expect(publishEvents.execute).toHaveBeenCalledTimes(1);
      });

      it('Then the context contains the user, tokens and session after execution', async () => {
        const ctx = await saga.run({ ...baseSagaContext });

        expect(ctx.user).toBeDefined();
        expect(ctx.accessToken).toBe('mock-access-token');
        expect(ctx.refreshToken).toBe('mock-refresh-token');
        expect(ctx.session).toBeDefined();
      });
    });
  });

  describe('Given a customer with invalid credentials', () => {
    describe('When the validate step throws InvalidCredentialsException', () => {
      it('Then the transaction is rolled back and no session is created', async () => {
        validateCredentials.execute.mockRejectedValue(new InvalidCredentialsException());

        await expect(saga.run({ ...baseSagaContext })).rejects.toBeInstanceOf(
          InvalidCredentialsException,
        );

        expect(uow.begin).toHaveBeenCalledTimes(1);
        expect(uow.rollback).toHaveBeenCalledTimes(1);
        expect(uow.commit).not.toHaveBeenCalled();

        expect(generateTokens.execute).not.toHaveBeenCalled();
        expect(createSession.execute).not.toHaveBeenCalled();
        expect(publishEvents.execute).not.toHaveBeenCalled();
      });
    });
  });

  describe('Given a customer whose account is deactivated', () => {
    describe('When the validate step throws AccountDeactivatedException', () => {
      it('Then the transaction is rolled back and the error propagates', async () => {
        validateCredentials.execute.mockRejectedValue(new AccountDeactivatedException());

        await expect(saga.run({ ...baseSagaContext })).rejects.toBeInstanceOf(
          AccountDeactivatedException,
        );

        expect(uow.rollback).toHaveBeenCalledTimes(1);
        expect(uow.commit).not.toHaveBeenCalled();
        expect(createSession.execute).not.toHaveBeenCalled();
      });
    });
  });

  describe('Given a DB failure during session creation', () => {
    describe('When the create-session step throws mid-transaction', () => {
      it('Then all writes are rolled back and no events are published', async () => {
        createSession.execute.mockRejectedValue(new Error('Session insert failed'));

        await expect(saga.run({ ...baseSagaContext })).rejects.toThrow('Session insert failed');

        expect(uow.rollback).toHaveBeenCalledTimes(1);
        expect(uow.commit).not.toHaveBeenCalled();
        expect(publishEvents.execute).not.toHaveBeenCalled();
      });
    });
  });

  describe('Given the event bus is down after the DB commit', () => {
    describe('When the publish-events step throws', () => {
      it('Then the error is swallowed and the sign-in succeeds (fire-and-forget guarantee)', async () => {
        publishEvents.execute.mockRejectedValue(new Error('EventBus unavailable'));

        const ctx = await saga.run({ ...baseSagaContext });

        expect(uow.commit).toHaveBeenCalledTimes(1);
        expect(uow.rollback).not.toHaveBeenCalled();
        expect(ctx.user).toBeDefined();
        expect(ctx.accessToken).toBeDefined();
      });
    });
  });

  describe('Step execution order', () => {
    it('should call validate → generate → create-session → publish in declared order', async () => {
      const callOrder: string[] = [];

      validateCredentials.execute.mockImplementation((ctx: SignInSagaContext) => {
        callOrder.push('validate-credentials');
        ctx.user = mockUser;
      });
      generateTokens.execute.mockImplementation((ctx: SignInSagaContext) => {
        callOrder.push('generate-tokens');
        ctx.accessToken = 'tok';
        ctx.refreshToken = 'tok';
      });
      createSession.execute.mockImplementation((ctx: SignInSagaContext) => {
        callOrder.push('create-session');
        ctx.session = mockSession as unknown as SignInSagaContext['session'];
      });
      publishEvents.execute.mockImplementation(() => callOrder.push('publish-events'));

      await saga.run({ ...baseSagaContext });

      expect(callOrder).toEqual([
        'validate-credentials',
        'generate-tokens',
        'create-session',
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
      it('Then it returns ok with user, accessToken, refreshToken and emailVerificationRequired=false', async () => {
        const result = await saga.execute({ ...baseSagaContext });

        expect(result.isOk()).toBe(true);
        const output = result._unsafeUnwrap();
        expect(output.user.email).toBe('ana@example.com');
        expect(output.accessToken).toBe('mock-access-token');
        expect(output.refreshToken).toBe('mock-refresh-token');
        expect(output.emailVerificationRequired).toBe(false);
      });
    });

    describe('Given the credentials are invalid', () => {
      it('Then it returns err wrapping the InvalidCredentialsException', async () => {
        validateCredentials.execute.mockRejectedValue(new InvalidCredentialsException());

        const result = await saga.execute({ ...baseSagaContext });

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(InvalidCredentialsException);
      });
    });

    describe('Given an infrastructure error is thrown', () => {
      it('Then it re-throws the error without wrapping in Result', async () => {
        createSession.execute.mockRejectedValue(new Error('Hard DB failure'));

        await expect(saga.execute({ ...baseSagaContext })).rejects.toThrow('Hard DB failure');
      });
    });

    describe('Given all steps succeed but a required output field is missing from context', () => {
      it('Then it re-throws an invariant violation error', async () => {
        // Steps complete without throwing but do not populate ctx.user
        validateCredentials.execute.mockImplementation(() => Promise.resolve());

        await expect(saga.execute({ ...baseSagaContext })).rejects.toThrow(
          'SignInSaga completed without required output fields',
        );
      });
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { SignUpSaga } from '@authentication/application/sagas/sign-up/sign-up.saga';
import { SignUpSagaContext } from '@authentication/application/sagas/sign-up/sign-up.saga-context';
import {
  ValidateSignUpStep,
  PrepareCredentialsStep,
  RegisterUserStep,
  GenerateTokensStep,
  CreateSessionStep,
  CreateVerificationTokenStep,
  PublishSignUpEventsStep,
  SendVerificationEmailStep,
} from '@authentication/application/sagas/sign-up/steps';
import { EmailAlreadyExistsException } from '@authentication/domain/exceptions/email-already-exists.exception';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { UserMother } from '@test/helpers/object-mother/user.mother';
import { IPersistedUserView } from '@shared/domain/contracts/user-view.contract';

describe('SignUpSaga', () => {
  let saga: SignUpSaga;
  let validateSignUp: { execute: jest.Mock };
  let prepareCredentials: { execute: jest.Mock };
  let registerUser: { execute: jest.Mock; compensate?: jest.Mock };
  let generateTokens: { execute: jest.Mock };
  let createSession: { execute: jest.Mock };
  let createVerification: { execute: jest.Mock };
  let publishEvents: { execute: jest.Mock };
  let sendVerificationEmail: { execute: jest.Mock };
  let uow: { begin: jest.Mock; commit: jest.Mock; rollback: jest.Mock; isActive: jest.Mock };

  const mockUser = UserMother.create({
    id: 1,
    uuid: '550e8400-e29b-41d4-a716-446655440001',
    email: 'test@example.com',
    username: 'testuser',
  }) as unknown as IPersistedUserView;

  const baseSagaContext: SignUpSagaContext = {
    email: 'test@example.com',
    username: 'testuser',
    password: 'Password1',
    lang: 'es',
  };

  beforeEach(async () => {
    const mockValidateSignUp = { execute: jest.fn() };
    const mockPrepareCredentials = {
      execute: jest.fn().mockImplementation((ctx: SignUpSagaContext) => {
        ctx.passwordHash = 'hashed-password';
        ctx.verificationCode = 'ABC123';
      }),
    };
    const mockRegisterUser = {
      execute: jest.fn().mockImplementation((ctx: SignUpSagaContext) => {
        ctx.user = mockUser;
      }),
    };
    const mockGenerateTokens = {
      execute: jest.fn().mockImplementation((ctx: SignUpSagaContext) => {
        ctx.accessToken = 'mock-access-token';
        ctx.refreshToken = 'mock-refresh-token';
      }),
    };
    const mockCreateSession = { execute: jest.fn() };
    const mockCreateVerification = { execute: jest.fn() };
    const mockPublishEvents = { execute: jest.fn() };
    const mockSendVerificationEmail = { execute: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SignUpSaga,
        { provide: ValidateSignUpStep, useValue: mockValidateSignUp },
        { provide: PrepareCredentialsStep, useValue: mockPrepareCredentials },
        { provide: RegisterUserStep, useValue: mockRegisterUser },
        { provide: GenerateTokensStep, useValue: mockGenerateTokens },
        { provide: CreateSessionStep, useValue: mockCreateSession },
        { provide: CreateVerificationTokenStep, useValue: mockCreateVerification },
        { provide: PublishSignUpEventsStep, useValue: mockPublishEvents },
        { provide: SendVerificationEmailStep, useValue: mockSendVerificationEmail },
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

    saga = module.get(SignUpSaga);
    validateSignUp = module.get(ValidateSignUpStep);
    prepareCredentials = module.get(PrepareCredentialsStep);
    registerUser = module.get(RegisterUserStep);
    generateTokens = module.get(GenerateTokensStep);
    createSession = module.get(CreateSessionStep);
    createVerification = module.get(CreateVerificationTokenStep);
    publishEvents = module.get(PublishSignUpEventsStep);
    sendVerificationEmail = module.get(SendVerificationEmailStep);
    uow = module.get(INJECTION_TOKENS.UNIT_OF_WORK);
  });

  describe('Given valid sign-up data', () => {
    describe('When the saga runs successfully', () => {
      it('Then it orchestrates all step handlers inside a transaction and publishes events after commit', async () => {
        const ctx = await saga.run({ ...baseSagaContext });

        // UoW lifecycle
        expect(uow.begin).toHaveBeenCalledTimes(1);
        expect(uow.commit).toHaveBeenCalledTimes(1);
        expect(uow.rollback).not.toHaveBeenCalled();

        // All step handlers called
        expect(validateSignUp.execute).toHaveBeenCalledTimes(1);
        expect(prepareCredentials.execute).toHaveBeenCalledTimes(1);
        expect(registerUser.execute).toHaveBeenCalledTimes(1);
        expect(generateTokens.execute).toHaveBeenCalledTimes(1);
        expect(createSession.execute).toHaveBeenCalledTimes(1);
        expect(createVerification.execute).toHaveBeenCalledTimes(1);
        expect(publishEvents.execute).toHaveBeenCalledTimes(1);
        expect(sendVerificationEmail.execute).toHaveBeenCalledTimes(1);

        // Context populated by step handlers
        expect(ctx.user).toBeDefined();
        expect(ctx.user?.email).toBe('test@example.com');
        expect(ctx.accessToken).toBe('mock-access-token');
        expect(ctx.refreshToken).toBe('mock-refresh-token');
      });
    });
  });

  describe('Given a DB failure during user registration', () => {
    describe('When the saga runs', () => {
      it('Then it rolls back the transaction and does not call subsequent steps', async () => {
        registerUser.execute.mockRejectedValue(new Error('Unique constraint violated'));

        await expect(saga.run({ ...baseSagaContext })).rejects.toThrow(
          'Unique constraint violated',
        );

        expect(uow.begin).toHaveBeenCalledTimes(1);
        expect(uow.rollback).toHaveBeenCalledTimes(1);
        expect(uow.commit).not.toHaveBeenCalled();

        // Steps before register-user were attempted
        expect(validateSignUp.execute).toHaveBeenCalledTimes(1);
        expect(prepareCredentials.execute).toHaveBeenCalledTimes(1);
        expect(registerUser.execute).toHaveBeenCalledTimes(1);

        // Steps after the failure were not attempted
        expect(generateTokens.execute).not.toHaveBeenCalled();
        expect(createSession.execute).not.toHaveBeenCalled();
        expect(createVerification.execute).not.toHaveBeenCalled();
        expect(publishEvents.execute).not.toHaveBeenCalled();
        expect(sendVerificationEmail.execute).not.toHaveBeenCalled();
      });
    });
  });

  describe('Given a failure during session creation (mid-transaction)', () => {
    describe('When the saga runs', () => {
      it('Then it rolls back all writes including the user', async () => {
        createSession.execute.mockRejectedValue(new Error('Connection lost'));

        await expect(saga.run({ ...baseSagaContext })).rejects.toThrow('Connection lost');

        // Steps before session ran
        expect(validateSignUp.execute).toHaveBeenCalled();
        expect(prepareCredentials.execute).toHaveBeenCalled();
        expect(registerUser.execute).toHaveBeenCalled();
        expect(generateTokens.execute).toHaveBeenCalled();
        expect(createSession.execute).toHaveBeenCalled();

        // Steps after the failure were not attempted
        expect(createVerification.execute).not.toHaveBeenCalled();

        expect(uow.rollback).toHaveBeenCalledTimes(1);
        expect(uow.commit).not.toHaveBeenCalled();
        expect(publishEvents.execute).not.toHaveBeenCalled();
        expect(sendVerificationEmail.execute).not.toHaveBeenCalled();
      });
    });
  });

  describe('Given event publishing fails after commit', () => {
    describe('When the saga runs', () => {
      it('Then it swallows the error (events are fire-and-forget) and returns the context', async () => {
        publishEvents.execute.mockRejectedValue(new Error('EventBus down'));

        const ctx = await saga.run({ ...baseSagaContext });

        // Transaction succeeded
        expect(uow.commit).toHaveBeenCalledTimes(1);
        expect(ctx.user).toBeDefined();
        expect(ctx.accessToken).toBeDefined();
      });
    });
  });

  describe('Given the verification email fails to send after the DB commit', () => {
    describe('When the email provider rejects the request', () => {
      it('Then it completes successfully and the user registration is preserved (local-first guarantee)', async () => {
        jest.useFakeTimers();
        sendVerificationEmail.execute.mockRejectedValue(new Error('SMTP connection refused'));

        const sagaPromise = saga.run({ ...baseSagaContext });
        await jest.runAllTimersAsync();
        const ctx = await sagaPromise;

        jest.useRealTimers();

        expect(uow.commit).toHaveBeenCalledTimes(1);
        expect(uow.rollback).not.toHaveBeenCalled();
        expect(ctx.user).toBeDefined();
        expect(ctx.accessToken).toBeDefined();
        expect(ctx.refreshToken).toBeDefined();
      });

      it('Then the DB commit occurs before any email attempt', async () => {
        const callOrder: string[] = [];

        uow.commit.mockImplementation(() => {
          callOrder.push('commit');
          return Promise.resolve();
        });
        sendVerificationEmail.execute.mockImplementation(() => {
          callOrder.push('send-email');
          return Promise.resolve();
        });

        await saga.run({ ...baseSagaContext });

        const commitIndex = callOrder.indexOf('commit');
        const emailIndex = callOrder.indexOf('send-email');
        expect(commitIndex).toBeGreaterThanOrEqual(0);
        expect(emailIndex).toBeGreaterThan(commitIndex);
      });
    });
  });

  describe('Given a transactional step fails before the commit', () => {
    describe('When the DB rejects the write', () => {
      it('Then the verification email is never attempted (local-first guarantee)', async () => {
        createVerification.execute.mockRejectedValue(new Error('Foreign key violation'));

        await expect(saga.run({ ...baseSagaContext })).rejects.toThrow('Foreign key violation');

        expect(uow.rollback).toHaveBeenCalledTimes(1);
        expect(uow.commit).not.toHaveBeenCalled();
        expect(publishEvents.execute).not.toHaveBeenCalled();
        expect(sendVerificationEmail.execute).not.toHaveBeenCalled();
      });
    });
  });

  describe('step execution order', () => {
    it('should call step handlers in the declared order', async () => {
      const callOrder: string[] = [];

      validateSignUp.execute.mockImplementation(() => {
        callOrder.push('validate-sign-up');
      });
      prepareCredentials.execute.mockImplementation((ctx: SignUpSagaContext) => {
        callOrder.push('prepare-credentials');
        ctx.passwordHash = 'hashed';
        ctx.verificationCode = 'CODE';
      });
      registerUser.execute.mockImplementation((ctx: SignUpSagaContext) => {
        callOrder.push('register-user');
        ctx.user = mockUser;
      });
      generateTokens.execute.mockImplementation((ctx: SignUpSagaContext) => {
        callOrder.push('generate-tokens');
        ctx.accessToken = 'tok';
        ctx.refreshToken = 'tok';
      });
      createSession.execute.mockImplementation(() => {
        callOrder.push('create-session');
      });
      createVerification.execute.mockImplementation(() => {
        callOrder.push('create-verification');
      });
      publishEvents.execute.mockImplementation(() => {
        callOrder.push('publish-events');
      });
      sendVerificationEmail.execute.mockImplementation(() => {
        callOrder.push('send-verification-email');
      });

      await saga.run({ ...baseSagaContext });

      expect(callOrder).toEqual([
        'validate-sign-up',
        'prepare-credentials',
        'register-user',
        'generate-tokens',
        'create-session',
        'create-verification',
        'publish-events',
        'send-verification-email',
      ]);
    });
  });

  describe('execute() — Result wrapper', () => {
    describe('Given the saga succeeds', () => {
      it('Then it returns ok with the saga output', async () => {
        const result = await saga.execute({ ...baseSagaContext });

        expect(result.isOk()).toBe(true);
        const output = result._unsafeUnwrap();
        expect(output.user.email).toBe('test@example.com');
        expect(output.accessToken).toBe('mock-access-token');
        expect(output.refreshToken).toBe('mock-refresh-token');
      });
    });

    describe('Given a domain exception is thrown', () => {
      it('Then it returns err with the exception', async () => {
        validateSignUp.execute.mockRejectedValue(new EmailAlreadyExistsException());

        const result = await saga.execute({ ...baseSagaContext });

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(EmailAlreadyExistsException);
      });
    });

    describe('Given an infrastructure error is thrown', () => {
      it('Then it re-throws the error (not wrapped in Result)', async () => {
        registerUser.execute.mockRejectedValue(new Error('DB down'));

        await expect(saga.execute({ ...baseSagaContext })).rejects.toThrow('DB down');
      });
    });

    describe('Given all steps complete but the generate-tokens step did not populate tokens in context', () => {
      it('Then it re-throws the invariant violation error', async () => {
        generateTokens.execute.mockImplementation(() => {
          // intentionally does not set ctx.accessToken or ctx.refreshToken
        });

        await expect(saga.execute({ ...baseSagaContext })).rejects.toThrow(
          'Saga completed without required output fields',
        );
      });
    });
  });
});

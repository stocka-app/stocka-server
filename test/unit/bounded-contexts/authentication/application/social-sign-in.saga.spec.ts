import { Test, TestingModule } from '@nestjs/testing';
import { SocialSignInSaga } from '@authentication/application/sagas/social-sign-in/social-sign-in.saga';
import { SocialSignInSagaContext } from '@authentication/application/sagas/social-sign-in/social-sign-in.saga-context';
import {
  ResolveSocialUserStep,
  GenerateSocialTokensStep,
  CreateSocialSessionStep,
  PublishSocialSignInEventsStep,
} from '@authentication/application/sagas/social-sign-in/steps';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { UserMother } from '@test/helpers/object-mother/user.mother';
import { IPersistedUserView } from '@shared/domain/contracts/user-view.contract';
import { TokenExpiredException } from '@authentication/domain/exceptions/token-expired.exception';

describe('SocialSignInSaga', () => {
  let saga: SocialSignInSaga;
  let resolveUser: { execute: jest.Mock };
  let generateTokens: { execute: jest.Mock };
  let createSession: { execute: jest.Mock };
  let publishEvents: { execute: jest.Mock };
  let uow: { begin: jest.Mock; commit: jest.Mock; rollback: jest.Mock; isActive: jest.Mock };

  const mockUser = UserMother.createSocialOnly({
    id: 42,
    uuid: '550e8400-e29b-41d4-a716-446655440042',
    email: 'ana.torres@gmail.com',
    provider: 'google',
  }) as unknown as IPersistedUserView;

  const baseSagaContext: SocialSignInSagaContext = {
    email: 'ana.torres@gmail.com',
    displayName: 'Ana Torres',
    provider: 'google',
    providerId: 'google-uid-999',
  };

  beforeEach(async () => {
    const mockResolveUser = {
      execute: jest.fn().mockImplementation((ctx: SocialSignInSagaContext) => {
        ctx.user = mockUser;
        ctx.path = 'existing-provider';
      }),
    };
    const mockGenerateTokens = {
      execute: jest.fn().mockImplementation((ctx: SocialSignInSagaContext) => {
        ctx.accessToken = 'mock-access-token';
        ctx.refreshToken = 'mock-refresh-token';
      }),
    };
    const mockCreateSession = { execute: jest.fn() };
    const mockPublishEvents = { execute: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SocialSignInSaga,
        { provide: ResolveSocialUserStep, useValue: mockResolveUser },
        { provide: GenerateSocialTokensStep, useValue: mockGenerateTokens },
        { provide: CreateSocialSessionStep, useValue: mockCreateSession },
        { provide: PublishSocialSignInEventsStep, useValue: mockPublishEvents },
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

    saga = module.get(SocialSignInSaga);
    resolveUser = module.get(ResolveSocialUserStep);
    generateTokens = module.get(GenerateSocialTokensStep);
    createSession = module.get(CreateSocialSessionStep);
    publishEvents = module.get(PublishSocialSignInEventsStep);
    uow = module.get(INJECTION_TOKENS.UNIT_OF_WORK);
  });

  describe('Given a customer who signs in via an already-linked OAuth provider', () => {
    describe('When the saga runs successfully', () => {
      it('Then it calls all steps in order and commits the transaction before publishing events', async () => {
        const ctx = await saga.run({ ...baseSagaContext });

        expect(uow.begin).toHaveBeenCalledTimes(1);
        expect(uow.commit).toHaveBeenCalledTimes(1);
        expect(uow.rollback).not.toHaveBeenCalled();

        expect(resolveUser.execute).toHaveBeenCalledTimes(1);
        expect(generateTokens.execute).toHaveBeenCalledTimes(1);
        expect(createSession.execute).toHaveBeenCalledTimes(1);
        expect(publishEvents.execute).toHaveBeenCalledTimes(1);

        expect(ctx.user).toBeDefined();
        expect(ctx.accessToken).toBe('mock-access-token');
        expect(ctx.refreshToken).toBe('mock-refresh-token');
        expect(ctx.path).toBe('existing-provider');
      });
    });
  });

  describe('Given a customer whose provider resolution sets path to linked-provider', () => {
    describe('When the saga runs successfully', () => {
      it('Then the path is preserved in the context returned to the caller', async () => {
        resolveUser.execute.mockImplementation((ctx: SocialSignInSagaContext) => {
          ctx.user = mockUser;
          ctx.path = 'linked-provider';
        });

        const ctx = await saga.run({ ...baseSagaContext });

        expect(ctx.path).toBe('linked-provider');
        expect(uow.commit).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Given a brand-new customer signing in via OAuth for the first time', () => {
    describe('When the saga runs successfully', () => {
      it('Then it creates the user and completes all steps with path set to new-user', async () => {
        resolveUser.execute.mockImplementation((ctx: SocialSignInSagaContext) => {
          ctx.user = mockUser;
          ctx.path = 'new-user';
        });

        const ctx = await saga.run({ ...baseSagaContext });

        expect(ctx.path).toBe('new-user');
        expect(uow.begin).toHaveBeenCalledTimes(1);
        expect(uow.commit).toHaveBeenCalledTimes(1);
        expect(ctx.user).toBeDefined();
        expect(ctx.accessToken).toBe('mock-access-token');
      });
    });
  });

  describe('Given a DB failure during user resolution', () => {
    describe('When the resolve step throws an error', () => {
      it('Then the transaction is rolled back and subsequent steps are not called', async () => {
        resolveUser.execute.mockRejectedValue(new Error('DB connection lost'));

        await expect(saga.run({ ...baseSagaContext })).rejects.toThrow('DB connection lost');

        expect(uow.begin).toHaveBeenCalledTimes(1);
        expect(uow.rollback).toHaveBeenCalledTimes(1);
        expect(uow.commit).not.toHaveBeenCalled();

        expect(resolveUser.execute).toHaveBeenCalledTimes(1);
        expect(generateTokens.execute).not.toHaveBeenCalled();
        expect(createSession.execute).not.toHaveBeenCalled();
        expect(publishEvents.execute).not.toHaveBeenCalled();
      });
    });
  });

  describe('Given a DB failure during session creation', () => {
    describe('When the create-session step throws mid-transaction', () => {
      it('Then all writes are rolled back including any new user that was created', async () => {
        createSession.execute.mockRejectedValue(new Error('Session insert failed'));

        await expect(saga.run({ ...baseSagaContext })).rejects.toThrow('Session insert failed');

        expect(resolveUser.execute).toHaveBeenCalledTimes(1);
        expect(generateTokens.execute).toHaveBeenCalledTimes(1);
        expect(createSession.execute).toHaveBeenCalledTimes(1);

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
    it('should call resolve → generate → create-session → publish in declared order', async () => {
      const callOrder: string[] = [];

      resolveUser.execute.mockImplementation((ctx: SocialSignInSagaContext) => {
        callOrder.push('resolve-social-user');
        ctx.user = mockUser;
        ctx.path = 'new-user';
      });
      generateTokens.execute.mockImplementation((ctx: SocialSignInSagaContext) => {
        callOrder.push('generate-tokens');
        ctx.accessToken = 'tok';
        ctx.refreshToken = 'tok';
      });
      createSession.execute.mockImplementation(() => {
        callOrder.push('create-session');
      });
      publishEvents.execute.mockImplementation(() => {
        callOrder.push('publish-events');
      });

      await saga.run({ ...baseSagaContext });

      expect(callOrder).toEqual([
        'resolve-social-user',
        'generate-tokens',
        'create-session',
        'publish-events',
      ]);
    });
  });

  describe('DB commit happens before event publishing', () => {
    it('should commit the transaction before firing any domain events', async () => {
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
    describe('Given the saga succeeds', () => {
      it('Then it returns ok with user, accessToken and refreshToken', async () => {
        const result = await saga.execute({ ...baseSagaContext });

        expect(result.isOk()).toBe(true);
        const output = result._unsafeUnwrap();
        expect(output.user.email).toBe('ana.torres@gmail.com');
        expect(output.accessToken).toBe('mock-access-token');
        expect(output.refreshToken).toBe('mock-refresh-token');
      });
    });

    describe('Given an infrastructure error is thrown inside the saga', () => {
      it('Then it re-throws the error without wrapping in Result', async () => {
        createSession.execute.mockRejectedValue(new Error('Hard DB failure'));

        await expect(saga.execute({ ...baseSagaContext })).rejects.toThrow('Hard DB failure');
      });
    });

    describe('Given all steps complete but generate-tokens step did not populate tokens', () => {
      it('Then it re-throws the invariant violation error', async () => {
        generateTokens.execute.mockImplementation(() => {
          // intentionally does not set ctx.accessToken or ctx.refreshToken
        });

        await expect(saga.execute({ ...baseSagaContext })).rejects.toThrow(
          'SocialSignInSaga completed without required output fields',
        );
      });
    });

    describe('Given a step throws a DomainException', () => {
      it('Then it returns err with the domain exception', async () => {
        resolveUser.execute.mockRejectedValue(new TokenExpiredException());

        const result = await saga.execute({ ...baseSagaContext });

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(TokenExpiredException);
      });
    });
  });
});

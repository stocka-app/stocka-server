import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, throwError, lastValueFrom } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { RateLimitInterceptor } from '@common/interceptors/rate-limit.interceptor';
import { RateLimitConfig } from '@common/decorators/rate-limit.decorator';
import { IVerificationAttemptContract } from '@authentication/domain/contracts/verification-attempt.contract';
import { MediatorService } from '@shared/infrastructure/mediator/mediator.service';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { VerificationAttemptModel } from '@authentication/domain/models/verification-attempt.model';
import { UserMother } from '@test/helpers/object-mother/user.mother';
import { EventBus } from '@nestjs/cqrs';
import { UserVerificationBlockedByAuthenticationEvent } from '@shared/domain/events/integration';

class InvalidCredentialsException extends DomainException {
  constructor() {
    super('Invalid credentials', 'INVALID_CREDENTIALS', []);
  }
}

class OtherException extends DomainException {
  constructor() {
    super('Some other error', 'OTHER_ERROR', []);
  }
}

describe('RateLimitInterceptor', () => {
  let interceptor: RateLimitInterceptor;
  let attemptContract: jest.Mocked<IVerificationAttemptContract>;
  let mediator: { user: { findByEmailOrUsername: jest.Mock } };
  let eventBus: jest.Mocked<EventBus>;

  const signInRateLimitConfig: RateLimitConfig = {
    type: 'sign_in',
    maxAttemptsByIp: 30,
    maxAttemptsByIdentifier: 15,
    identifierSource: 'body.emailOrUsername',
    trackFailedAttempts: true,
    progressiveBlock: {
      thresholds: [
        { attempts: 7, blockMinutes: 5 },
        { attempts: 10, blockMinutes: 15 },
      ],
    },
    failureErrorCodes: ['INVALID_CREDENTIALS'],
  };

  const createMockExecutionContext = (
    rateLimitConfig?: RateLimitConfig,
    clientIp = '192.168.1.1',
    identifier?: string,
  ): ExecutionContext => {
    const mockRequest = {
      body: { emailOrUsername: identifier || 'test@example.com' },
      headers: { 'user-agent': 'Jest Test Agent' },
      __rateLimitConfig: rateLimitConfig,
      __clientIp: clientIp,
      __rateLimitIdentifier: identifier,
    };

    return {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => ({}),
        getNext: () => jest.fn(),
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn() as unknown,
      getType: () => 'http',
      getArgs: () => [],
      getArgByIndex: () => undefined,
      switchToRpc: () => ({ getContext: jest.fn(), getData: jest.fn() }),
      switchToWs: () => ({ getClient: jest.fn(), getData: jest.fn(), getPattern: jest.fn() }),
    } as unknown as ExecutionContext;
  };

  const createMockCallHandler = (response?: unknown, error?: Error): CallHandler => ({
    handle: () => (error ? throwError(() => error) : of(response)),
  });

  // Helper to intercept and catch error, returning the error
  const interceptAndCatchError = async (
    context: ExecutionContext,
    callHandler: CallHandler,
  ): Promise<Error> => {
    let caughtError: Error | undefined;
    await lastValueFrom(
      interceptor.intercept(context, callHandler).pipe(
        catchError((err) => {
          caughtError = err;
          return of(null);
        }),
      ),
    );
    return caughtError!;
  };

  beforeEach(async () => {
    const mockAttemptContract = {
      countFailedByIpAddressInLastHourByType: jest.fn(),
      countFailedByIdentifierInLastHourByType: jest.fn(),
      countFailedByUserUUIDInLastHourByType: jest.fn(),
      persist: jest.fn(),
    };

    const mockMediator = {
      user: {
        findByEmailOrUsername: jest.fn(),
      },
    };

    const mockEventBus = {
      publish: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateLimitInterceptor,
        { provide: INJECTION_TOKENS.VERIFICATION_ATTEMPT_CONTRACT, useValue: mockAttemptContract },
        { provide: MediatorService, useValue: mockMediator },
        { provide: EventBus, useValue: mockEventBus },
      ],
    }).compile();

    interceptor = module.get<RateLimitInterceptor>(RateLimitInterceptor);
    attemptContract = module.get(INJECTION_TOKENS.VERIFICATION_ATTEMPT_CONTRACT);
    mediator = module.get(MediatorService);
    eventBus = module.get(EventBus);
  });

  describe('intercept', () => {
    it('should pass through successful responses without tracking', async () => {
      const context = createMockExecutionContext(signInRateLimitConfig);
      const callHandler = createMockCallHandler({ success: true });

      const result = await lastValueFrom(interceptor.intercept(context, callHandler));

      expect(result).toEqual({ success: true });
      expect(attemptContract.persist).not.toHaveBeenCalled();
    });

    it('should not track errors when no rate limit config is present', async () => {
      const context = createMockExecutionContext();
      const error = new InvalidCredentialsException();
      const callHandler = createMockCallHandler(undefined, error);

      const caughtError = await interceptAndCatchError(context, callHandler);

      expect(caughtError).toBe(error);
      expect(attemptContract.persist).not.toHaveBeenCalled();
    });

    it('should not track errors when trackFailedAttempts is false', async () => {
      const configNoTracking: RateLimitConfig = {
        ...signInRateLimitConfig,
        trackFailedAttempts: false,
      };
      const context = createMockExecutionContext(configNoTracking);
      const error = new InvalidCredentialsException();
      const callHandler = createMockCallHandler(undefined, error);

      const caughtError = await interceptAndCatchError(context, callHandler);

      expect(caughtError).toBe(error);
      expect(attemptContract.persist).not.toHaveBeenCalled();
    });

    it('should not track errors with errorCode not in failureErrorCodes', async () => {
      const context = createMockExecutionContext(
        signInRateLimitConfig,
        '192.168.1.1',
        'test@example.com',
      );
      const error = new OtherException();
      const callHandler = createMockCallHandler(undefined, error);

      const caughtError = await interceptAndCatchError(context, callHandler);

      expect(caughtError).toBe(error);
      expect(attemptContract.persist).not.toHaveBeenCalled();
    });

    it('should track failed attempts when errorCode matches failureErrorCodes', async () => {
      const mockUser = UserMother.create({ email: 'test@example.com' });
      const context = createMockExecutionContext(
        signInRateLimitConfig,
        '192.168.1.1',
        'test@example.com',
      );
      const error = new InvalidCredentialsException();
      const callHandler = createMockCallHandler(undefined, error);

      mediator.user.findByEmailOrUsername.mockResolvedValue(mockUser);
      attemptContract.countFailedByUserUUIDInLastHourByType.mockResolvedValue(3);
      attemptContract.persist.mockResolvedValue({} as VerificationAttemptModel);

      const caughtError = await interceptAndCatchError(context, callHandler);

      expect(caughtError).toBe(error);
      expect(attemptContract.persist).toHaveBeenCalled();
    });

    it('should track attempt with correct verification type', async () => {
      const mockUser = UserMother.create({ email: 'test@example.com' });
      const context = createMockExecutionContext(
        signInRateLimitConfig,
        '192.168.1.1',
        'test@example.com',
      );
      const error = new InvalidCredentialsException();
      const callHandler = createMockCallHandler(undefined, error);

      mediator.user.findByEmailOrUsername.mockResolvedValue(mockUser);
      attemptContract.countFailedByUserUUIDInLastHourByType.mockResolvedValue(3);
      attemptContract.persist.mockResolvedValue({} as VerificationAttemptModel);

      await interceptAndCatchError(context, callHandler);

      const persistCall = attemptContract.persist.mock.calls[0][0];
      expect(persistCall.verificationType.toString()).toBe('sign_in');
      expect(persistCall.result.isSuccessful()).toBe(false);
      expect(persistCall.ipAddress.toString()).toBe('192.168.1.1');
    });

    it('should activate progressive block when threshold is exceeded', async () => {
      const mockUser = UserMother.create({
        uuid: '550e8400-e29b-41d4-a716-446655440001',
        email: 'test@example.com',
      });
      const context = createMockExecutionContext(
        signInRateLimitConfig,
        '192.168.1.1',
        'test@example.com',
      );
      const error = new InvalidCredentialsException();
      const callHandler = createMockCallHandler(undefined, error);

      mediator.user.findByEmailOrUsername.mockResolvedValue(mockUser);
      attemptContract.countFailedByUserUUIDInLastHourByType.mockResolvedValue(7);
      attemptContract.persist.mockResolvedValue({} as VerificationAttemptModel);

      await interceptAndCatchError(context, callHandler);

      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          userUUID: '550e8400-e29b-41d4-a716-446655440001',
          blockedUntil: expect.any(Date),
        }),
      );
    });

    it('should apply highest matching threshold', async () => {
      const mockUser = UserMother.create({
        uuid: '550e8400-e29b-41d4-a716-446655440001',
        email: 'test@example.com',
      });
      const context = createMockExecutionContext(
        signInRateLimitConfig,
        '192.168.1.1',
        'test@example.com',
      );
      const error = new InvalidCredentialsException();
      const callHandler = createMockCallHandler(undefined, error);

      mediator.user.findByEmailOrUsername.mockResolvedValue(mockUser);
      attemptContract.countFailedByUserUUIDInLastHourByType.mockResolvedValue(10);
      attemptContract.persist.mockResolvedValue({} as VerificationAttemptModel);

      await interceptAndCatchError(context, callHandler);

      const publishCall = (eventBus.publish as jest.Mock).mock
        .calls[0][0] as UserVerificationBlockedByAuthenticationEvent;
      const minutesBlocked = Math.round((publishCall.blockedUntil.getTime() - Date.now()) / 60000);
      expect(minutesBlocked).toBe(15);
    });

    it('should not block when below all thresholds', async () => {
      const mockUser = UserMother.create({ email: 'test@example.com' });
      const context = createMockExecutionContext(
        signInRateLimitConfig,
        '192.168.1.1',
        'test@example.com',
      );
      const error = new InvalidCredentialsException();
      const callHandler = createMockCallHandler(undefined, error);

      mediator.user.findByEmailOrUsername.mockResolvedValue(mockUser);
      attemptContract.countFailedByUserUUIDInLastHourByType.mockResolvedValue(3);
      attemptContract.persist.mockResolvedValue({} as VerificationAttemptModel);

      await interceptAndCatchError(context, callHandler);

      expect(eventBus.publish).not.toHaveBeenCalled();
    });

    it('should track by IP with email when user not found and identifier is email', async () => {
      const context = createMockExecutionContext(
        signInRateLimitConfig,
        '192.168.1.1',
        'nonexistent@example.com',
      );
      const error = new InvalidCredentialsException();
      const callHandler = createMockCallHandler(undefined, error);

      mediator.user.findByEmailOrUsername.mockResolvedValue(null);
      attemptContract.persist.mockResolvedValue({} as VerificationAttemptModel);

      const caughtError = await interceptAndCatchError(context, callHandler);

      expect(caughtError).toBe(error);
      expect(attemptContract.persist).toHaveBeenCalled();
      const persistCall = attemptContract.persist.mock.calls[0][0];
      expect(persistCall.userUUID).toBeNull();
      expect(persistCall.email?.toString()).toBe('nonexistent@example.com');
    });

    it('should track by IP with null email when user not found and identifier is username', async () => {
      const context = createMockExecutionContext(
        signInRateLimitConfig,
        '192.168.1.1',
        'randomusername',
      );
      const error = new InvalidCredentialsException();
      const callHandler = createMockCallHandler(undefined, error);

      mediator.user.findByEmailOrUsername.mockResolvedValue(null);
      attemptContract.persist.mockResolvedValue({} as VerificationAttemptModel);

      const caughtError = await interceptAndCatchError(context, callHandler);

      expect(caughtError).toBe(error);
      expect(attemptContract.persist).toHaveBeenCalled();
      const persistCall = attemptContract.persist.mock.calls[0][0];
      expect(persistCall.userUUID).toBeNull();
      expect(persistCall.email).toBeNull();
    });

    it('should always re-throw the original exception', async () => {
      const mockUser = UserMother.create({ email: 'test@example.com' });
      const context = createMockExecutionContext(
        signInRateLimitConfig,
        '192.168.1.1',
        'test@example.com',
      );
      const originalError = new InvalidCredentialsException();
      const callHandler = createMockCallHandler(undefined, originalError);

      mediator.user.findByEmailOrUsername.mockResolvedValue(mockUser);
      attemptContract.countFailedByUserUUIDInLastHourByType.mockResolvedValue(3);
      attemptContract.persist.mockResolvedValue({} as VerificationAttemptModel);

      const caughtError = await interceptAndCatchError(context, callHandler);

      expect(caughtError).toBe(originalError);
      expect(caughtError).toBeInstanceOf(InvalidCredentialsException);
    });
  });
});

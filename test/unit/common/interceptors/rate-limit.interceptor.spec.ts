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

    it('should re-throw the original exception even when handleError itself fails', async () => {
      const context = createMockExecutionContext(
        signInRateLimitConfig,
        '192.168.1.1',
        'test@example.com',
      );
      const originalError = new InvalidCredentialsException();
      const callHandler = createMockCallHandler(undefined, originalError);

      mediator.user.findByEmailOrUsername.mockResolvedValue({ uuid: 'u', email: 'test@example.com' });
      attemptContract.persist.mockRejectedValue(new Error('DB connection lost'));
      attemptContract.countFailedByUserUUIDInLastHourByType.mockResolvedValue(0);

      const caughtError = await interceptAndCatchError(context, callHandler);
      // Even though handleError rejected, original error must be re-thrown
      expect(caughtError).toBe(originalError);
    });

    it('should extract errorCode from HTTP response error objects', async () => {
      const context = createMockExecutionContext(
        { ...signInRateLimitConfig, failureErrorCodes: ['VALIDATION_ERROR'] },
        '192.168.1.1',
        'test@example.com',
      );
      // Simulate an HttpException-like error with a response.error string
      const httpError = { response: { error: 'VALIDATION_ERROR', statusCode: 400 } };
      const callHandler = createMockCallHandler(undefined, httpError as unknown as Error);

      mediator.user.findByEmailOrUsername.mockResolvedValue(null);
      attemptContract.persist.mockResolvedValue({} as VerificationAttemptModel);

      const caughtError = await interceptAndCatchError(context, callHandler);

      expect(caughtError).toBe(httpError);
      expect(attemptContract.persist).toHaveBeenCalled();
    });

    it('should return null from extractErrorCode for plain Error objects', async () => {
      const context = createMockExecutionContext(
        signInRateLimitConfig,
        '192.168.1.1',
        'test@example.com',
      );
      // Plain Error has no response.error — extractErrorCode returns null → no tracking
      const plainError = new Error('generic error');
      const callHandler = createMockCallHandler(undefined, plainError);

      const caughtError = await interceptAndCatchError(context, callHandler);

      expect(caughtError).toBe(plainError);
      expect(attemptContract.persist).not.toHaveBeenCalled();
    });

    it('should use 0.0.0.0 when clientIp is not set on request', async () => {
      // Create context without __clientIp (undefined)
      const mockRequest = {
        body: { emailOrUsername: 'test@example.com' },
        headers: { 'user-agent': 'Jest Test Agent' },
        __rateLimitConfig: signInRateLimitConfig,
        __clientIp: undefined,
        __rateLimitIdentifier: 'test@example.com',
      };
      const context = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
          getResponse: () => ({}),
          getNext: () => jest.fn(),
        }),
        getHandler: () => jest.fn(),
        getClass: () => jest.fn(),
      } as unknown as import('@nestjs/common').ExecutionContext;

      const error = new InvalidCredentialsException();
      const callHandler = createMockCallHandler(undefined, error);

      mediator.user.findByEmailOrUsername.mockResolvedValue(null);
      attemptContract.persist.mockResolvedValue({} as import('@authentication/domain/models/verification-attempt.model').VerificationAttemptModel);

      await interceptAndCatchError(context, callHandler);

      const persistCall = attemptContract.persist.mock.calls[0][0];
      expect(persistCall.ipAddress.toString()).toBe('0.0.0.0');
    });

    it('should track by IP only when identifier is not set on request', async () => {
      const mockRequest = {
        body: {},
        headers: { 'user-agent': 'Jest Test Agent' },
        __rateLimitConfig: signInRateLimitConfig,
        __clientIp: '10.0.0.1',
        __rateLimitIdentifier: undefined,
      };
      const context = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
          getResponse: () => ({}),
          getNext: () => jest.fn(),
        }),
        getHandler: () => jest.fn(),
        getClass: () => jest.fn(),
      } as unknown as import('@nestjs/common').ExecutionContext;

      const error = new InvalidCredentialsException();
      const callHandler = createMockCallHandler(undefined, error);

      attemptContract.persist.mockResolvedValue({} as import('@authentication/domain/models/verification-attempt.model').VerificationAttemptModel);

      await interceptAndCatchError(context, callHandler);

      expect(mediator.user.findByEmailOrUsername).not.toHaveBeenCalled();
      const persistCall = attemptContract.persist.mock.calls[0][0];
      expect(persistCall.userUUID).toBeNull();
      expect(persistCall.email).toBeNull();
    });

    it('should set userAgent to null when no user-agent header is present (user found path)', async () => {
      const mockUser = UserMother.create({ email: 'test@example.com' });
      const mockRequest = {
        body: { emailOrUsername: 'test@example.com' },
        headers: {},
        __rateLimitConfig: { ...signInRateLimitConfig, progressiveBlock: undefined },
        __clientIp: '192.168.1.1',
        __rateLimitIdentifier: 'test@example.com',
      };
      const context = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
          getResponse: () => ({}),
          getNext: () => jest.fn(),
        }),
        getHandler: () => jest.fn(),
        getClass: () => jest.fn(),
      } as unknown as import('@nestjs/common').ExecutionContext;

      const error = new InvalidCredentialsException();
      const callHandler = createMockCallHandler(undefined, error);

      mediator.user.findByEmailOrUsername.mockResolvedValue(mockUser);
      attemptContract.persist.mockResolvedValue({} as import('@authentication/domain/models/verification-attempt.model').VerificationAttemptModel);

      await interceptAndCatchError(context, callHandler);

      const persistCall = attemptContract.persist.mock.calls[0][0];
      expect(persistCall.userAgent).toBeNull();
    });

    it('should set userAgent to null when no user-agent header is present (no user path)', async () => {
      const mockRequest = {
        body: {},
        headers: {},
        __rateLimitConfig: signInRateLimitConfig,
        __clientIp: '192.168.1.1',
        __rateLimitIdentifier: 'nonexistent@example.com',
      };
      const context = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
          getResponse: () => ({}),
          getNext: () => jest.fn(),
        }),
        getHandler: () => jest.fn(),
        getClass: () => jest.fn(),
      } as unknown as import('@nestjs/common').ExecutionContext;

      const error = new InvalidCredentialsException();
      const callHandler = createMockCallHandler(undefined, error);

      mediator.user.findByEmailOrUsername.mockResolvedValue(null);
      attemptContract.persist.mockResolvedValue({} as import('@authentication/domain/models/verification-attempt.model').VerificationAttemptModel);

      await interceptAndCatchError(context, callHandler);

      const persistCall = attemptContract.persist.mock.calls[0][0];
      expect(persistCall.userAgent).toBeNull();
    });

    it('should not call evaluateBlock when config has no progressiveBlock (user found path)', async () => {
      const mockUser = UserMother.create({ email: 'test@example.com' });
      const context = createMockExecutionContext(
        { ...signInRateLimitConfig, progressiveBlock: undefined },
        '192.168.1.1',
        'test@example.com',
      );
      const error = new InvalidCredentialsException();
      const callHandler = createMockCallHandler(undefined, error);

      mediator.user.findByEmailOrUsername.mockResolvedValue(mockUser);
      attemptContract.persist.mockResolvedValue({} as import('@authentication/domain/models/verification-attempt.model').VerificationAttemptModel);

      await interceptAndCatchError(context, callHandler);

      expect(attemptContract.countFailedByUserUUIDInLastHourByType).not.toHaveBeenCalled();
      expect(eventBus.publish).not.toHaveBeenCalled();
    });

    it('should return null from extractErrorCode when response.error is not a string', async () => {
      const context = createMockExecutionContext(
        signInRateLimitConfig,
        '192.168.1.1',
        'test@example.com',
      );
      // error.response.error is an object, not a string → extractErrorCode returns null
      const weirdError = { response: { error: { code: 'INVALID_CREDENTIALS' }, statusCode: 400 } };
      const callHandler = createMockCallHandler(undefined, weirdError as unknown as Error);

      const caughtError = await interceptAndCatchError(context, callHandler);

      expect(caughtError).toBe(weirdError);
      expect(attemptContract.persist).not.toHaveBeenCalled();
    });

    it('should return immediately from evaluateBlock when config has no progressiveBlock (defensive guard)', () => {
      // Call private evaluateBlock directly to cover the defensive early-return branch at line 150.
      // The public API never reaches this branch (caller checks progressiveBlock first),
      // so we access the private method via casting.
      const mockUser = UserMother.create({ email: 'test@example.com' });
      const configWithoutBlock = {
        type: 'sign_in' as const,
        maxAttemptsByIp: 30,
        trackFailedAttempts: true,
        failureErrorCodes: ['INVALID_CREDENTIALS'],
        // progressiveBlock intentionally absent
      };

      // Should not throw and should not call eventBus.publish
      expect(() => {
        (interceptor as unknown as { evaluateBlock: (u: unknown, f: number, c: unknown) => void }).evaluateBlock(
          mockUser,
          10,
          configWithoutBlock,
        );
      }).not.toThrow();

      expect(eventBus.publish).not.toHaveBeenCalled();
    });
  });
});

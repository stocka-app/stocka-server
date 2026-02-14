import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { RateLimitInterceptor } from '@common/interceptors/rate-limit.interceptor';
import { RateLimitConfig } from '@common/decorators/rate-limit.decorator';
import { IVerificationAttemptContract } from '@auth/domain/contracts/verification-attempt.contract';
import { MediatorService } from '@shared/infrastructure/mediator/mediator.service';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { VerificationAttemptModel } from '@auth/domain/models/verification-attempt.model';
import { UserMother } from '@test/helpers/object-mother/user.mother';

// Utility to wait for async operations with retries
const waitForCondition = async (
  condition: () => boolean,
  maxWait = 100,
  interval = 5,
): Promise<void> => {
  const startTime = Date.now();
  while (!condition() && Date.now() - startTime < maxWait) {
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
};

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
  let mediator: jest.Mocked<MediatorService>;

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

  beforeEach(async () => {
    const mockAttemptContract = {
      countFailedByIpAddressInLastHourByType: jest.fn(),
      countFailedByIdentifierInLastHourByType: jest.fn(),
      countFailedByUserUuidInLastHourByType: jest.fn(),
      persist: jest.fn(),
    };

    const mockMediator = {
      findUserByEmailOrUsername: jest.fn(),
      blockUserVerification: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateLimitInterceptor,
        { provide: INJECTION_TOKENS.VERIFICATION_ATTEMPT_CONTRACT, useValue: mockAttemptContract },
        { provide: MediatorService, useValue: mockMediator },
      ],
    }).compile();

    interceptor = module.get<RateLimitInterceptor>(RateLimitInterceptor);
    attemptContract = module.get(INJECTION_TOKENS.VERIFICATION_ATTEMPT_CONTRACT);
    mediator = module.get(MediatorService);
  });

  describe('intercept', () => {
    it('should pass through successful responses without tracking', (done) => {
      const context = createMockExecutionContext(signInRateLimitConfig);
      const callHandler = createMockCallHandler({ success: true });

      interceptor.intercept(context, callHandler).subscribe({
        next: (result) => {
          expect(result).toEqual({ success: true });
          expect(attemptContract.persist).not.toHaveBeenCalled();
          done();
        },
        error: done.fail,
      });
    });

    it('should not track errors when no rate limit config is present', (done) => {
      const context = createMockExecutionContext(undefined);
      const error = new InvalidCredentialsException();
      const callHandler = createMockCallHandler(undefined, error);

      interceptor.intercept(context, callHandler).subscribe({
        next: () => done.fail('Should have thrown'),
        error: (err) => {
          expect(err).toBe(error);
          expect(attemptContract.persist).not.toHaveBeenCalled();
          done();
        },
      });
    });

    it('should not track errors when trackFailedAttempts is false', (done) => {
      const configNoTracking: RateLimitConfig = {
        ...signInRateLimitConfig,
        trackFailedAttempts: false,
      };
      const context = createMockExecutionContext(configNoTracking);
      const error = new InvalidCredentialsException();
      const callHandler = createMockCallHandler(undefined, error);

      interceptor.intercept(context, callHandler).subscribe({
        next: () => done.fail('Should have thrown'),
        error: (err) => {
          expect(err).toBe(error);
          expect(attemptContract.persist).not.toHaveBeenCalled();
          done();
        },
      });
    });

    it('should not track errors with errorCode not in failureErrorCodes', (done) => {
      const context = createMockExecutionContext(
        signInRateLimitConfig,
        '192.168.1.1',
        'test@example.com',
      );
      const error = new OtherException();
      const callHandler = createMockCallHandler(undefined, error);
      mediator.findUserByEmailOrUsername.mockResolvedValue(UserMother.create());

      interceptor.intercept(context, callHandler).subscribe({
        next: () => done.fail('Should have thrown'),
        error: (err) => {
          expect(err).toBe(error);
          expect(attemptContract.persist).not.toHaveBeenCalled();
          done();
        },
      });
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

      mediator.findUserByEmailOrUsername.mockResolvedValue(mockUser);
      attemptContract.countFailedByUserUuidInLastHourByType.mockResolvedValue(3);
      attemptContract.persist.mockResolvedValue({} as VerificationAttemptModel);

      await new Promise<void>((resolve, reject) => {
        interceptor.intercept(context, callHandler).subscribe({
          next: () => reject(new Error('Should have thrown')),
          error: (err) => {
            expect(err).toBe(error);
            resolve();
          },
        });
      });

      // Wait for persist to be called
      await waitForCondition(() => attemptContract.persist.mock.calls.length > 0);
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

      mediator.findUserByEmailOrUsername.mockResolvedValue(mockUser);
      attemptContract.countFailedByUserUuidInLastHourByType.mockResolvedValue(3);
      attemptContract.persist.mockResolvedValue({} as VerificationAttemptModel);

      await new Promise<void>((resolve, reject) => {
        interceptor.intercept(context, callHandler).subscribe({
          next: () => reject(new Error('Should have thrown')),
          error: () => resolve(),
        });
      });

      // Wait for persist to be called
      await waitForCondition(() => attemptContract.persist.mock.calls.length > 0);
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

      mediator.findUserByEmailOrUsername.mockResolvedValue(mockUser);
      attemptContract.countFailedByUserUuidInLastHourByType.mockResolvedValue(7); // Exceeds first threshold
      attemptContract.persist.mockResolvedValue({} as VerificationAttemptModel);
      mediator.blockUserVerification.mockResolvedValue(undefined);

      await new Promise<void>((resolve, reject) => {
        interceptor.intercept(context, callHandler).subscribe({
          next: () => reject(new Error('Should have thrown')),
          error: () => resolve(),
        });
      });

      // Wait for blockUserVerification to be called
      await waitForCondition(() => mediator.blockUserVerification.mock.calls.length > 0);
      expect(mediator.blockUserVerification).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440001',
        expect.any(Date),
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

      mediator.findUserByEmailOrUsername.mockResolvedValue(mockUser);
      attemptContract.countFailedByUserUuidInLastHourByType.mockResolvedValue(10); // Exceeds second threshold
      attemptContract.persist.mockResolvedValue({} as VerificationAttemptModel);
      mediator.blockUserVerification.mockResolvedValue(undefined);

      await new Promise<void>((resolve, reject) => {
        interceptor.intercept(context, callHandler).subscribe({
          next: () => reject(new Error('Should have thrown')),
          error: () => resolve(),
        });
      });

      // Wait for blockUserVerification to be called
      await waitForCondition(() => mediator.blockUserVerification.mock.calls.length > 0);
      const blockCall = mediator.blockUserVerification.mock.calls[0];
      const blockedUntil = blockCall[1];
      const minutesBlocked = Math.round((blockedUntil.getTime() - Date.now()) / 60000);
      // Should be 15 minutes (second threshold), not 5 minutes (first threshold)
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

      mediator.findUserByEmailOrUsername.mockResolvedValue(mockUser);
      attemptContract.countFailedByUserUuidInLastHourByType.mockResolvedValue(3); // Below first threshold
      attemptContract.persist.mockResolvedValue({} as VerificationAttemptModel);

      await new Promise<void>((resolve, reject) => {
        interceptor.intercept(context, callHandler).subscribe({
          next: () => reject(new Error('Should have thrown')),
          error: () => resolve(),
        });
      });

      // Wait for persist to be called (this ensures handleError has completed)
      await waitForCondition(() => attemptContract.persist.mock.calls.length > 0);
      expect(mediator.blockUserVerification).not.toHaveBeenCalled();
    });

    it('should track by IP when user is not found', async () => {
      const context = createMockExecutionContext(
        signInRateLimitConfig,
        '192.168.1.1',
        'nonexistent@example.com',
      );
      const error = new InvalidCredentialsException();
      const callHandler = createMockCallHandler(undefined, error);

      mediator.findUserByEmailOrUsername.mockResolvedValue(null);
      attemptContract.persist.mockResolvedValue({} as VerificationAttemptModel);

      await new Promise<void>((resolve, reject) => {
        interceptor.intercept(context, callHandler).subscribe({
          next: () => reject(new Error('Should have thrown')),
          error: (err) => {
            expect(err).toBe(error);
            resolve();
          },
        });
      });

      // Wait for persist to be called
      await waitForCondition(() => attemptContract.persist.mock.calls.length > 0);
      // Should still track the attempt by IP even if user not found
      expect(attemptContract.persist).toHaveBeenCalled();
      const persistCall = attemptContract.persist.mock.calls[0][0];
      expect(persistCall.userUuid).toBeNull();
      expect(persistCall.email?.toString()).toBe('nonexistent@example.com');
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

      mediator.findUserByEmailOrUsername.mockResolvedValue(mockUser);
      attemptContract.countFailedByUserUuidInLastHourByType.mockResolvedValue(3);
      attemptContract.persist.mockResolvedValue({} as VerificationAttemptModel);

      let caughtError: Error | undefined;
      await new Promise<void>((resolve) => {
        interceptor.intercept(context, callHandler).subscribe({
          next: () => resolve(),
          error: (err) => {
            caughtError = err;
            resolve();
          },
        });
      });

      expect(caughtError).toBe(originalError);
      expect(caughtError).toBeInstanceOf(InvalidCredentialsException);
    });
  });
});

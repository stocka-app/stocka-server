import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RateLimitGuard } from '@common/guards/rate-limit.guard';
import { RateLimitConfig } from '@common/decorators/rate-limit.decorator';
import { IVerificationAttemptContract } from '@auth/domain/contracts/verification-attempt.contract';
import { MediatorService } from '@shared/infrastructure/mediator/mediator.service';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { UserMother } from '@test/helpers/object-mother/user.mother';

describe('RateLimitGuard', () => {
  let guard: RateLimitGuard;
  let reflector: jest.Mocked<Reflector>;
  let attemptContract: jest.Mocked<IVerificationAttemptContract>;
  let mediator: jest.Mocked<MediatorService>;

  const createMockExecutionContext = (
    body: Record<string, unknown> = {},
    ip = '192.168.1.1',
    headers: Record<string, string | string[]> = {},
  ): ExecutionContext => {
    const mockRequest = {
      body,
      ip,
      headers,
      socket: { remoteAddress: ip },
      __rateLimitConfig: undefined as RateLimitConfig | undefined,
      __clientIp: undefined as string | undefined,
      __rateLimitIdentifier: undefined as string | undefined,
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

  beforeEach(async () => {
    const mockReflector = {
      getAllAndOverride: jest.fn(),
    };

    const mockAttemptContract = {
      countFailedByIpAddressInLastHourByType: jest.fn(),
      countFailedByIdentifierInLastHourByType: jest.fn(),
      countFailedByUserUUIDInLastHourByType: jest.fn(),
      persist: jest.fn(),
    };

    const mockMediator = {
      findUserByEmailOrUsername: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateLimitGuard,
        { provide: Reflector, useValue: mockReflector },
        { provide: INJECTION_TOKENS.VERIFICATION_ATTEMPT_CONTRACT, useValue: mockAttemptContract },
        { provide: MediatorService, useValue: mockMediator },
      ],
    }).compile();

    guard = module.get<RateLimitGuard>(RateLimitGuard);
    reflector = module.get(Reflector);
    attemptContract = module.get(INJECTION_TOKENS.VERIFICATION_ATTEMPT_CONTRACT);
    mediator = module.get(MediatorService);
  });

  describe('canActivate', () => {
    it('should pass when no @RateLimit() decorator is present', async () => {
      reflector.getAllAndOverride.mockReturnValue(undefined);
      const context = createMockExecutionContext();

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(attemptContract.countFailedByIpAddressInLastHourByType).not.toHaveBeenCalled();
    });

    it('should pass when IP attempts are below limit', async () => {
      reflector.getAllAndOverride.mockReturnValue(signInRateLimitConfig);
      attemptContract.countFailedByIpAddressInLastHourByType.mockResolvedValue(5);
      attemptContract.countFailedByIdentifierInLastHourByType.mockResolvedValue(2);
      mediator.findUserByEmailOrUsername.mockResolvedValue(null);

      const context = createMockExecutionContext({ emailOrUsername: 'test@example.com' });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(attemptContract.countFailedByIpAddressInLastHourByType).toHaveBeenCalledWith(
        '192.168.1.1',
        'sign_in',
      );
    });

    it('should throw 429 when IP rate limit is exceeded', async () => {
      reflector.getAllAndOverride.mockReturnValue(signInRateLimitConfig);
      attemptContract.countFailedByIpAddressInLastHourByType.mockResolvedValue(30);

      const context = createMockExecutionContext({ emailOrUsername: 'test@example.com' });

      await expect(guard.canActivate(context)).rejects.toThrow(HttpException);

      try {
        await guard.canActivate(context);
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
        const response = (error as HttpException).getResponse() as Record<string, unknown>;
        expect(response.error).toBe('RATE_LIMIT_EXCEEDED');
      }
    });

    it('should throw 429 when identifier rate limit is exceeded', async () => {
      reflector.getAllAndOverride.mockReturnValue(signInRateLimitConfig);
      attemptContract.countFailedByIpAddressInLastHourByType.mockResolvedValue(5);
      attemptContract.countFailedByIdentifierInLastHourByType.mockResolvedValue(15);

      const context = createMockExecutionContext({ emailOrUsername: 'attacker@example.com' });

      await expect(guard.canActivate(context)).rejects.toThrow(HttpException);

      try {
        await guard.canActivate(context);
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
        const response = (error as HttpException).getResponse() as Record<string, unknown>;
        expect(response.error).toBe('RATE_LIMIT_EXCEEDED');
      }
    });

    it('should throw 429 when user account is temporarily blocked', async () => {
      reflector.getAllAndOverride.mockReturnValue(signInRateLimitConfig);
      attemptContract.countFailedByIpAddressInLastHourByType.mockResolvedValue(5);
      attemptContract.countFailedByIdentifierInLastHourByType.mockResolvedValue(5);

      const blockedUser = UserMother.create({
        email: 'blocked@example.com',
        verificationBlockedUntil: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes from now
      });
      mediator.findUserByEmailOrUsername.mockResolvedValue(blockedUser);

      const context = createMockExecutionContext({ emailOrUsername: 'blocked@example.com' });

      await expect(guard.canActivate(context)).rejects.toThrow(HttpException);

      try {
        await guard.canActivate(context);
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
        const response = (error as HttpException).getResponse() as Record<string, unknown>;
        expect(response.error).toBe('ACCOUNT_TEMPORARILY_LOCKED');
        expect(response.minutesRemaining).toBeDefined();
      }
    });

    it('should pass when user block has expired', async () => {
      reflector.getAllAndOverride.mockReturnValue(signInRateLimitConfig);
      attemptContract.countFailedByIpAddressInLastHourByType.mockResolvedValue(5);
      attemptContract.countFailedByIdentifierInLastHourByType.mockResolvedValue(5);

      const unlockedUser = UserMother.create({
        email: 'unlocked@example.com',
        verificationBlockedUntil: new Date(Date.now() - 1000), // Already expired
      });
      mediator.findUserByEmailOrUsername.mockResolvedValue(unlockedUser);

      const context = createMockExecutionContext({ emailOrUsername: 'unlocked@example.com' });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should pass when user does not exist (no block check needed)', async () => {
      reflector.getAllAndOverride.mockReturnValue(signInRateLimitConfig);
      attemptContract.countFailedByIpAddressInLastHourByType.mockResolvedValue(5);
      attemptContract.countFailedByIdentifierInLastHourByType.mockResolvedValue(5);
      mediator.findUserByEmailOrUsername.mockResolvedValue(null);

      const context = createMockExecutionContext({ emailOrUsername: 'nonexistent@example.com' });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should extract IP from x-forwarded-for header', async () => {
      reflector.getAllAndOverride.mockReturnValue(signInRateLimitConfig);
      attemptContract.countFailedByIpAddressInLastHourByType.mockResolvedValue(0);
      attemptContract.countFailedByIdentifierInLastHourByType.mockResolvedValue(0);
      mediator.findUserByEmailOrUsername.mockResolvedValue(null);

      const context = createMockExecutionContext(
        { emailOrUsername: 'test@example.com' },
        '127.0.0.1',
        { 'x-forwarded-for': '203.0.113.50, 70.41.3.18, 150.172.238.178' },
      );

      await guard.canActivate(context);

      expect(attemptContract.countFailedByIpAddressInLastHourByType).toHaveBeenCalledWith(
        '203.0.113.50',
        'sign_in',
      );
    });

    it('should correctly extract identifier from nested body path', async () => {
      reflector.getAllAndOverride.mockReturnValue(signInRateLimitConfig);
      attemptContract.countFailedByIpAddressInLastHourByType.mockResolvedValue(0);
      attemptContract.countFailedByIdentifierInLastHourByType.mockResolvedValue(0);
      mediator.findUserByEmailOrUsername.mockResolvedValue(null);

      const context = createMockExecutionContext({ emailOrUsername: 'extracted@example.com' });

      await guard.canActivate(context);

      expect(attemptContract.countFailedByIdentifierInLastHourByType).toHaveBeenCalledWith(
        'extracted@example.com',
        'sign_in',
      );
    });

    it('should attach config and IP to request for interceptor use', async () => {
      reflector.getAllAndOverride.mockReturnValue(signInRateLimitConfig);
      attemptContract.countFailedByIpAddressInLastHourByType.mockResolvedValue(0);
      attemptContract.countFailedByIdentifierInLastHourByType.mockResolvedValue(0);
      mediator.findUserByEmailOrUsername.mockResolvedValue(null);

      const context = createMockExecutionContext({ emailOrUsername: 'test@example.com' });
      const request = context.switchToHttp().getRequest();

      await guard.canActivate(context);

      expect(request.__rateLimitConfig).toEqual(signInRateLimitConfig);
      expect(request.__clientIp).toBe('192.168.1.1');
      expect(request.__rateLimitIdentifier).toBe('test@example.com');
    });

    it('should not check identifier rate limit when identifierSource is not configured', async () => {
      const configWithoutIdentifier: RateLimitConfig = {
        type: 'general',
        maxAttemptsByIp: 100,
        trackFailedAttempts: false,
        failureErrorCodes: [],
      };

      reflector.getAllAndOverride.mockReturnValue(configWithoutIdentifier);
      attemptContract.countFailedByIpAddressInLastHourByType.mockResolvedValue(0);

      const context = createMockExecutionContext();

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(attemptContract.countFailedByIdentifierInLastHourByType).not.toHaveBeenCalled();
    });
  });
});

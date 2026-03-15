import { ExecutionContext } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { RATE_LIMIT_KEY, RateLimit } from '@common/decorators/rate-limit.decorator';
import { ClientIp } from '@common/decorators/client-ip.decorator';
import { CurrentUser, JwtPayload } from '@common/decorators/current-user.decorator';

/** Extract the factory function stored by createParamDecorator */
function extractParamFactory(
  Decorator: (...args: unknown[]) => ParameterDecorator,
): (data: unknown, ctx: ExecutionContext) => unknown {
  class TestHost {
    method(): void {}
  }
  const applyDecorator = Decorator();
  applyDecorator(TestHost.prototype, 'method', 0);
  const meta = Reflect.getMetadata(ROUTE_ARGS_METADATA, TestHost, 'method') as Record<
    string,
    { factory: (data: unknown, ctx: ExecutionContext) => unknown }
  >;
  const key = Object.keys(meta)[0];
  return meta[key].factory;
}

function buildContext(requestOverride: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => requestOverride,
    }),
  } as unknown as ExecutionContext;
}

// ─── ClientIp decorator ───────────────────────────────────────────────────────
describe('ClientIp decorator', () => {
  let factory: (data: unknown, ctx: ExecutionContext) => unknown;

  beforeEach(() => {
    factory = extractParamFactory(ClientIp as unknown as (...args: unknown[]) => ParameterDecorator);
  });

  describe('Given a request with an x-forwarded-for header as a comma-separated string', () => {
    describe('When the decorator extracts the client IP', () => {
      it('Then it returns the first IP from the header', () => {
        const ctx = buildContext({
          headers: { 'x-forwarded-for': '203.0.113.50, 70.41.3.18' },
          ip: '127.0.0.1',
          socket: { remoteAddress: '127.0.0.1' },
        });
        expect(factory(undefined, ctx)).toBe('203.0.113.50');
      });
    });
  });

  describe('Given a request with x-forwarded-for as an array', () => {
    describe('When the decorator extracts the client IP', () => {
      it('Then it returns the first element of the array', () => {
        const ctx = buildContext({
          headers: { 'x-forwarded-for': ['10.0.0.1', '10.0.0.2'] },
          ip: '127.0.0.1',
          socket: { remoteAddress: '127.0.0.1' },
        });
        expect(factory(undefined, ctx)).toBe('10.0.0.1');
      });
    });
  });

  describe('Given a request without x-forwarded-for but with request.ip', () => {
    describe('When the decorator extracts the client IP', () => {
      it('Then it returns request.ip', () => {
        const ctx = buildContext({
          headers: {},
          ip: '192.168.0.5',
          socket: { remoteAddress: '192.168.0.9' },
        });
        expect(factory(undefined, ctx)).toBe('192.168.0.5');
      });
    });
  });

  describe('Given a request without x-forwarded-for or request.ip', () => {
    describe('When the decorator extracts the client IP', () => {
      it('Then it falls back to socket.remoteAddress', () => {
        const ctx = buildContext({
          headers: {},
          ip: undefined,
          socket: { remoteAddress: '10.10.10.10' },
        });
        expect(factory(undefined, ctx)).toBe('10.10.10.10');
      });
    });
  });

  describe('Given a request with no IP information at all', () => {
    describe('When the decorator extracts the client IP', () => {
      it('Then it returns 0.0.0.0 as fallback', () => {
        const ctx = buildContext({
          headers: {},
          ip: undefined,
          socket: { remoteAddress: undefined },
        });
        expect(factory(undefined, ctx)).toBe('0.0.0.0');
      });
    });
  });
});

// ─── CurrentUser decorator ────────────────────────────────────────────────────
describe('CurrentUser decorator', () => {
  let factory: (data: unknown, ctx: ExecutionContext) => unknown;

  beforeEach(() => {
    factory = extractParamFactory(CurrentUser as unknown as (...args: unknown[]) => ParameterDecorator);
  });

  const mockUser: JwtPayload = { uuid: 'user-uuid-123', email: 'user@test.com' };

  describe('Given a request with a valid user in the JWT payload', () => {
    describe('When called without a data key', () => {
      it('Then it returns the full user payload', () => {
        const ctx = buildContext({ user: mockUser });
        expect(factory(undefined, ctx)).toEqual(mockUser);
      });
    });

    describe('When called with a specific field key', () => {
      it('Then it returns the value for that field', () => {
        const ctx = buildContext({ user: mockUser });
        expect(factory('uuid', ctx)).toBe('user-uuid-123');
        expect(factory('email', ctx)).toBe('user@test.com');
      });
    });
  });

  describe('Given a request without a user (guard missing)', () => {
    describe('When the decorator is invoked', () => {
      it('Then it throws an error indicating the guard is not applied', () => {
        const ctx = buildContext({ user: undefined });
        expect(() => factory(undefined, ctx)).toThrow('User not found in request');
      });
    });
  });
});

// ─── RateLimit decorator ──────────────────────────────────────────────────────
describe('RateLimit decorator', () => {
  describe('Given a rate limit configuration', () => {
    describe('When applied to a controller method', () => {
      it('Then it sets the metadata key to the provided config', () => {
        class TestController {
          @RateLimit({
            type: 'sign_in',
            maxAttemptsByIp: 30,
            trackFailedAttempts: true,
            failureErrorCodes: ['INVALID_CREDENTIALS'],
          })
          signIn(): void {}
        }

        const target = TestController.prototype;
        const metadata = Reflect.getMetadata(RATE_LIMIT_KEY, target.signIn);
        expect(metadata).toBeDefined();
        expect(metadata.type).toBe('sign_in');
        expect(metadata.maxAttemptsByIp).toBe(30);
        expect(metadata.trackFailedAttempts).toBe(true);
      });

      it('Then it includes optional progressiveBlock when provided', () => {
        class TestController {
          @RateLimit({
            type: 'verify_email',
            maxAttemptsByIp: 10,
            trackFailedAttempts: false,
            failureErrorCodes: [],
            progressiveBlock: {
              thresholds: [{ attempts: 5, blockMinutes: 15 }],
            },
          })
          verify(): void {}
        }

        const metadata = Reflect.getMetadata(RATE_LIMIT_KEY, TestController.prototype.verify);
        expect(metadata.progressiveBlock).toBeDefined();
        expect(metadata.progressiveBlock.thresholds).toHaveLength(1);
      });
    });
  });
});

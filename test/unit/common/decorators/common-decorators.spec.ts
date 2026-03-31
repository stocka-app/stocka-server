import { ExecutionContext } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { RATE_LIMIT_KEY, RateLimit } from '@common/decorators/rate-limit.decorator';
import { ClientIp } from '@common/decorators/client-ip.decorator';
import { CurrentUser, JwtPayload } from '@common/decorators/current-user.decorator';
import { CurrentTenant } from '@common/decorators/current-tenant.decorator';
import { CurrentMember } from '@common/decorators/current-member.decorator';
import { IsCountryCode } from '@common/decorators/country-code.decorator';
import { TenantMembershipContext } from '@tenant/domain/contracts/tenant-facade.contract';

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
    factory = extractParamFactory(
      ClientIp as unknown as (...args: unknown[]) => ParameterDecorator,
    );
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
    factory = extractParamFactory(
      CurrentUser as unknown as (...args: unknown[]) => ParameterDecorator,
    );
  });

  const mockUser: JwtPayload = {
    uuid: 'user-uuid-123',
    email: 'user@test.com',
    tenantId: null,
    role: null,
    tierLimits: null,
  };

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

// ─── IsCountryCode decorator ──────────────────────────────────────────────────
describe('IsCountryCode decorator', () => {
  class CountryDto {
    @IsCountryCode()
    country!: unknown;
  }

  async function runValidation(
    value: unknown,
  ): Promise<import('class-validator').ValidationError[]> {
    const { validate } = await import('class-validator');
    const dto = new CountryDto();
    dto.country = value;
    return validate(dto);
  }

  describe('Given the validator is applied to a property', () => {
    describe('When validate is called with a valid ISO 3166-1 alpha-2 country code', () => {
      it('Then it passes validation', async () => {
        const errors = await runValidation('US');
        expect(errors).toHaveLength(0);
      });

      it('Then it passes validation for lowercase codes too', async () => {
        const errors = await runValidation('mx');
        expect(errors).toHaveLength(0);
      });
    });

    describe('When validate is called with an invalid country code string', () => {
      it('Then it fails validation and the error message contains the property name', async () => {
        const errors = await runValidation('XX');
        expect(errors).toHaveLength(1);
        const messages = errors[0].constraints ?? {};
        const message = Object.values(messages)[0];
        expect(message).toContain('country');
        expect(message).toContain('ISO 3166-1 alpha-2');
      });
    });

    describe('When validate is called with a non-string value', () => {
      it('Then it fails validation for a number', async () => {
        const errors = await runValidation(123);
        expect(errors).toHaveLength(1);
      });

      it('Then it fails validation for null', async () => {
        const errors = await runValidation(null);
        expect(errors).toHaveLength(1);
      });
    });
  });
});

// ─── CurrentTenant decorator ──────────────────────────────────────────────────
describe('CurrentTenant decorator', () => {
  let factory: (data: unknown, ctx: ExecutionContext) => unknown;

  const MEMBERSHIP_CONTEXT: TenantMembershipContext = {
    tenantUUID: 'tenant-uuid-001',
    role: 'OWNER',
    tenantStatus: 'active',
    tier: 'ENTERPRISE',
    usageCounts: { storageCount: 1, memberCount: 2, productCount: 5 },
  };

  beforeEach(() => {
    factory = extractParamFactory(
      CurrentTenant as unknown as (...args: unknown[]) => ParameterDecorator,
    );
  });

  describe('Given a request with a membership context (TenantGuard ran)', () => {
    describe('When CurrentTenant is invoked', () => {
      it('Then it returns tenantUUID, status, and tier from the context', () => {
        const ctx = buildContext({ membershipContext: MEMBERSHIP_CONTEXT });
        expect(factory(undefined, ctx)).toEqual({
          tenantUUID: 'tenant-uuid-001',
          status: 'active',
          tier: 'ENTERPRISE',
        });
      });
    });
  });

  describe('Given a request without membership context (TenantGuard not applied)', () => {
    describe('When CurrentTenant is invoked', () => {
      it('Then it throws an error indicating TenantGuard is not applied', () => {
        const ctx = buildContext({ membershipContext: undefined });
        expect(() => factory(undefined, ctx)).toThrow('Ensure TenantGuard is applied');
      });
    });
  });
});

// ─── CurrentMember decorator ──────────────────────────────────────────────────
describe('CurrentMember decorator', () => {
  let factory: (data: unknown, ctx: ExecutionContext) => unknown;

  const MEMBERSHIP_CONTEXT: TenantMembershipContext = {
    tenantUUID: 'tenant-uuid-002',
    role: 'MANAGER',
    tenantStatus: 'active',
    tier: 'STARTER',
    usageCounts: { storageCount: 1, memberCount: 3, productCount: 50 },
  };

  beforeEach(() => {
    factory = extractParamFactory(
      CurrentMember as unknown as (...args: unknown[]) => ParameterDecorator,
    );
  });

  describe('Given a request with a membership context (TenantGuard ran)', () => {
    describe('When CurrentMember is invoked', () => {
      it('Then it returns role and tenantUUID from the context', () => {
        const ctx = buildContext({ membershipContext: MEMBERSHIP_CONTEXT });
        expect(factory(undefined, ctx)).toEqual({
          role: 'MANAGER',
          tenantUUID: 'tenant-uuid-002',
        });
      });
    });
  });

  describe('Given a request without membership context (TenantGuard not applied)', () => {
    describe('When CurrentMember is invoked', () => {
      it('Then it throws an error indicating TenantGuard is not applied', () => {
        const ctx = buildContext({ membershipContext: undefined });
        expect(() => factory(undefined, ctx)).toThrow('Ensure TenantGuard is applied');
      });
    });
  });
});

// ─── Secure decorator ───────────────────────────────────────────────────────
describe('Secure decorator', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Secure } = require('@common/decorators/secure.decorator') as {
    Secure: () => MethodDecorator;
  };
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { SECURE_KEY } = require('@common/security/security.types') as {
    SECURE_KEY: string;
  };

  describe('Given the @Secure() decorator', () => {
    describe('When applied to a controller method', () => {
      it('Then it sets the SECURE_KEY metadata to true', () => {
        class TestController {
          @Secure()
          handle(): void {}
        }

        const metadata = Reflect.getMetadata(SECURE_KEY, TestController.prototype.handle);
        expect(metadata).toBe(true);
      });
    });
  });
});

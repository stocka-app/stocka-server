import { UnauthorizedException, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { JwtValidator } from '@common/security/validators/jwt.validator';

function buildExecutionContext(authHeader?: string): ExecutionContext {
  const request: Record<string, unknown> = { headers: {}, user: undefined };
  if (authHeader !== undefined) {
    (request.headers as Record<string, string>)['authorization'] = authHeader;
  }
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}

describe('JwtValidator', () => {
  let validator: JwtValidator;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;

  const JWT_SECRET = 'test-secret';

  beforeEach(() => {
    jwtService = {
      verify: jest.fn(),
    } as unknown as jest.Mocked<JwtService>;

    configService = {
      getOrThrow: jest.fn().mockReturnValue(JWT_SECRET),
    } as unknown as jest.Mocked<ConfigService>;

    validator = new JwtValidator(jwtService, configService);
  });

  describe('Given a request with no Authorization header', () => {
    describe('When the validator runs', () => {
      it('Then it throws UnauthorizedException with MISSING_TOKEN', () => {
        const ctx = buildExecutionContext();

        expect(() => validator.validate(ctx)).toThrow(UnauthorizedException);
        try {
          validator.validate(ctx);
        } catch (e) {
          expect((e as UnauthorizedException).getResponse()).toEqual({ error: 'MISSING_TOKEN' });
        }
      });
    });
  });

  describe('Given a request with an Authorization header that does not start with Bearer', () => {
    describe('When the validator runs', () => {
      it('Then it throws UnauthorizedException with MISSING_TOKEN', () => {
        const ctx = buildExecutionContext('Basic dXNlcjpwYXNz');

        expect(() => validator.validate(ctx)).toThrow(UnauthorizedException);
      });
    });
  });

  describe('Given a request with a valid Bearer token', () => {
    const decodedPayload = {
      sub: 'user-uuid-123',
      email: 'test@example.com',
      tenantId: 'tenant-uuid-456',
      role: 'OWNER',
      tierLimits: { tier: 'STARTER', maxCustomRooms: 5, maxStoreRooms: 3, maxWarehouses: 1 },
    };

    beforeEach(() => {
      jwtService.verify.mockReturnValue(decodedPayload);
    });

    describe('When the validator runs', () => {
      it('Then it returns a JwtPayload with the decoded fields', () => {
        const ctx = buildExecutionContext('Bearer valid.jwt.token');
        const result = validator.validate(ctx);

        expect(result).toEqual({
          uuid: 'user-uuid-123',
          email: 'test@example.com',
          tenantId: 'tenant-uuid-456',
          role: 'OWNER',
          tierLimits: decodedPayload.tierLimits,
        });
      });

      it('Then it verifies the token with the correct secret', () => {
        const ctx = buildExecutionContext('Bearer valid.jwt.token');
        validator.validate(ctx);

        expect(jwtService.verify).toHaveBeenCalledWith('valid.jwt.token', {
          secret: JWT_SECRET,
        });
        expect(configService.getOrThrow).toHaveBeenCalledWith('JWT_ACCESS_SECRET');
      });

      it('Then it populates request.user with the decoded payload', () => {
        const ctx = buildExecutionContext('Bearer valid.jwt.token');
        validator.validate(ctx);

        const request = ctx.switchToHttp().getRequest();
        expect(request.user).toEqual({
          uuid: 'user-uuid-123',
          email: 'test@example.com',
          tenantId: 'tenant-uuid-456',
          role: 'OWNER',
          tierLimits: decodedPayload.tierLimits,
        });
      });
    });
  });

  describe('Given a request with a Bearer token that has no tenantId or role', () => {
    beforeEach(() => {
      jwtService.verify.mockReturnValue({
        sub: 'user-uuid-789',
        email: 'new@example.com',
        tenantId: undefined,
        role: undefined,
        tierLimits: undefined,
      });
    });

    describe('When the validator runs', () => {
      it('Then it returns a JwtPayload with null for optional fields', () => {
        const ctx = buildExecutionContext('Bearer valid.jwt.token');
        const result = validator.validate(ctx);

        expect(result).toEqual({
          uuid: 'user-uuid-789',
          email: 'new@example.com',
          tenantId: null,
          role: null,
          tierLimits: null,
        });
      });
    });
  });

  describe('Given a request with an expired or malformed Bearer token', () => {
    beforeEach(() => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('jwt expired');
      });
    });

    describe('When the validator runs', () => {
      it('Then it throws UnauthorizedException with INVALID_TOKEN', () => {
        const ctx = buildExecutionContext('Bearer expired.jwt.token');

        expect(() => validator.validate(ctx)).toThrow(UnauthorizedException);
        try {
          validator.validate(ctx);
        } catch (e) {
          expect((e as UnauthorizedException).getResponse()).toEqual({ error: 'INVALID_TOKEN' });
        }
      });
    });
  });
});

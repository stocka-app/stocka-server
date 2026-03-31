import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { SecurityGuard } from '@common/security/security.guard';
import { JwtValidator } from '@common/security/validators/jwt.validator';
import { TenantAccessValidator } from '@common/security/validators/tenant-access.validator';
import { RbacValidator } from '@authorization/infrastructure/validators/rbac.validator';
import { JwtPayload } from '@common/decorators/current-user.decorator';
import { TenantMembershipContext } from '@tenant/domain/contracts/tenant-facade.contract';
import { SystemAction } from '@authorization/domain/enums/actions-catalog';

// Replace the registry at module level so tests control the route map
jest.mock('@common/security/security-registry', () => ({
  SecurityRegistry: {
    'GET /': { public: true },
    'GET /health': { public: true },
    'GET /users/me': {},
    'GET /tenant/me': { requireTenant: true },
    'POST /storages': { action: SystemAction.STORAGE_CREATE },
    'GET /storages': { action: SystemAction.STORAGE_READ },
  },
}));

function buildExecutionContext(
  controllerPath: string,
  handlerPath: string,
  methodIndex: number,
): ExecutionContext {
  const request: Record<string, unknown> = { headers: {}, user: undefined };

  const handler = jest.fn();
  Reflect.defineMetadata('path', handlerPath, handler);
  Reflect.defineMetadata('method', methodIndex, handler);

  const controllerClass = jest.fn();
  Reflect.defineMetadata('path', controllerPath, controllerClass);

  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    getHandler: () => handler,
    getClass: () => controllerClass,
  } as unknown as ExecutionContext;
}

// RequestMethod enum indices: GET=0, POST=1, PATCH=4, DELETE=5
const GET = 0;
const POST = 1;

describe('SecurityGuard', () => {
  let guard: SecurityGuard;
  let jwtValidator: jest.Mocked<JwtValidator>;
  let tenantAccessValidator: jest.Mocked<TenantAccessValidator>;
  let rbacValidator: jest.Mocked<RbacValidator>;

  const mockUser: JwtPayload = {
    uuid: 'user-uuid-123',
    email: 'test@example.com',
    tenantId: 'tenant-uuid-456',
    role: 'OWNER',
    tierLimits: null,
  };

  const mockMembership: TenantMembershipContext = {
    tenantUUID: 'tenant-uuid-456',
    role: 'OWNER',
    tenantStatus: 'active',
    tier: 'STARTER',
    usageCounts: { storageCount: 1, memberCount: 2, productCount: 5 },
  };

  beforeEach(() => {
    jwtValidator = {
      validate: jest.fn().mockReturnValue(mockUser),
    } as unknown as jest.Mocked<JwtValidator>;

    tenantAccessValidator = {
      validate: jest.fn().mockResolvedValue(mockMembership),
    } as unknown as jest.Mocked<TenantAccessValidator>;

    rbacValidator = {
      validate: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<RbacValidator>;

    guard = new SecurityGuard(jwtValidator, tenantAccessValidator, rbacValidator);
  });

  // ── Public routes ──────────────────────────────────────────────────────────

  describe('Given a public route (GET /)', () => {
    describe('When the guard evaluates the request', () => {
      it('Then it returns true without running any validator', async () => {
        const ctx = buildExecutionContext('', '/', GET);
        const result = await guard.canActivate(ctx);

        expect(result).toBe(true);
        expect(jwtValidator.validate).not.toHaveBeenCalled();
        expect(tenantAccessValidator.validate).not.toHaveBeenCalled();
        expect(rbacValidator.validate).not.toHaveBeenCalled();
      });
    });
  });

  describe('Given a public route (GET /health)', () => {
    describe('When the guard evaluates the request', () => {
      it('Then it returns true without running any validator', async () => {
        const ctx = buildExecutionContext('health', '', GET);
        const result = await guard.canActivate(ctx);

        expect(result).toBe(true);
        expect(jwtValidator.validate).not.toHaveBeenCalled();
      });
    });
  });

  // ── JWT-only routes ────────────────────────────────────────────────────────

  describe('Given a JWT-only route (GET /users/me)', () => {
    describe('When the user has a valid JWT', () => {
      it('Then it runs JwtValidator only and returns true', async () => {
        const ctx = buildExecutionContext('users', 'me', GET);
        const result = await guard.canActivate(ctx);

        expect(result).toBe(true);
        expect(jwtValidator.validate).toHaveBeenCalledWith(ctx);
        expect(tenantAccessValidator.validate).not.toHaveBeenCalled();
        expect(rbacValidator.validate).not.toHaveBeenCalled();
      });
    });

    describe('When the JWT is missing', () => {
      beforeEach(() => {
        jwtValidator.validate.mockImplementation(() => {
          throw new UnauthorizedException({ error: 'MISSING_TOKEN' });
        });
      });

      it('Then it throws UnauthorizedException', async () => {
        const ctx = buildExecutionContext('users', 'me', GET);
        await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
      });
    });
  });

  // ── JWT + Tenant routes ────────────────────────────────────────────────────

  describe('Given a JWT + Tenant route (GET /tenant/me)', () => {
    describe('When the user has a valid JWT and active tenant membership', () => {
      it('Then it runs JwtValidator and TenantAccessValidator and returns true', async () => {
        const ctx = buildExecutionContext('tenant', 'me', GET);
        const result = await guard.canActivate(ctx);

        expect(result).toBe(true);
        expect(jwtValidator.validate).toHaveBeenCalledWith(ctx);
        expect(tenantAccessValidator.validate).toHaveBeenCalledWith(mockUser);
        expect(rbacValidator.validate).not.toHaveBeenCalled();
      });

      it('Then it attaches membershipContext to the request', async () => {
        const ctx = buildExecutionContext('tenant', 'me', GET);
        await guard.canActivate(ctx);

        const request = ctx.switchToHttp().getRequest();
        expect(request.membershipContext).toEqual(mockMembership);
      });
    });

    describe('When the user has no tenant membership', () => {
      beforeEach(() => {
        tenantAccessValidator.validate.mockRejectedValue(
          new ForbiddenException({ error: 'TENANT_REQUIRED' }),
        );
      });

      it('Then it throws ForbiddenException', async () => {
        const ctx = buildExecutionContext('tenant', 'me', GET);
        await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
      });
    });
  });

  // ── JWT + Tenant + RBAC routes ─────────────────────────────────────────────

  describe('Given a JWT + Tenant + RBAC route (POST /storages)', () => {
    describe('When the user has all three: valid JWT, active membership, and required permission', () => {
      it('Then it runs all three validators and returns true', async () => {
        const ctx = buildExecutionContext('storages', '', POST);
        const result = await guard.canActivate(ctx);

        expect(result).toBe(true);
        expect(jwtValidator.validate).toHaveBeenCalledWith(ctx);
        expect(tenantAccessValidator.validate).toHaveBeenCalledWith(mockUser);
        expect(rbacValidator.validate).toHaveBeenCalledWith(
          mockUser,
          SystemAction.STORAGE_CREATE,
          mockMembership,
        );
      });

      it('Then it attaches membershipContext to the request', async () => {
        const ctx = buildExecutionContext('storages', '', POST);
        await guard.canActivate(ctx);

        const request = ctx.switchToHttp().getRequest();
        expect(request.membershipContext).toEqual(mockMembership);
      });
    });

    describe('When the RBAC check fails (role lacks permission)', () => {
      beforeEach(() => {
        rbacValidator.validate.mockRejectedValue(
          new ForbiddenException({ error: 'ACTION_NOT_ALLOWED' }),
        );
      });

      it('Then it throws ForbiddenException from the RBAC validator', async () => {
        const ctx = buildExecutionContext('storages', '', POST);
        await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
      });
    });
  });

  // ── Route key resolution ───────────────────────────────────────────────────

  describe('Given a route not in the registry', () => {
    describe('When the guard evaluates the request', () => {
      it('Then it falls through to JWT-only (meta is undefined, public is not true)', async () => {
        const ctx = buildExecutionContext('unknown', 'path', GET);
        const result = await guard.canActivate(ctx);

        expect(result).toBe(true);
        expect(jwtValidator.validate).toHaveBeenCalledWith(ctx);
        expect(tenantAccessValidator.validate).not.toHaveBeenCalled();
      });
    });
  });

  describe('Given a route where NestJS metadata returns undefined for method value', () => {
    describe('When the guard evaluates the request', () => {
      it('Then it falls back to GET and resolves the route key correctly', async () => {
        const request: Record<string, unknown> = { headers: {}, user: undefined };
        const handler = jest.fn();
        Reflect.defineMetadata('path', 'me', handler);
        // method metadata intentionally NOT set → undefined → fallback to GET
        const controllerClass = jest.fn();
        Reflect.defineMetadata('path', 'users', controllerClass);

        const ctx = {
          switchToHttp: () => ({ getRequest: () => request }),
          getHandler: () => handler,
          getClass: () => controllerClass,
        } as unknown as ExecutionContext;

        const result = await guard.canActivate(ctx);

        // GET /users/me is in the mocked registry as {} — JWT only
        expect(result).toBe(true);
        expect(jwtValidator.validate).toHaveBeenCalledWith(ctx);
        expect(tenantAccessValidator.validate).not.toHaveBeenCalled();
      });
    });
  });

  describe('Given a route where the controller class has no path metadata (undefined)', () => {
    describe('When the guard evaluates the request', () => {
      it('Then it falls back to empty string for controllerPath and resolves the key', async () => {
        const request: Record<string, unknown> = { headers: {}, user: undefined };
        const handler = jest.fn();
        Reflect.defineMetadata('path', '', handler);
        Reflect.defineMetadata('method', GET, handler);
        // class path metadata intentionally NOT set → undefined → falls back to ''
        const controllerClass = jest.fn();

        const ctx = {
          switchToHttp: () => ({ getRequest: () => request }),
          getHandler: () => handler,
          getClass: () => controllerClass,
        } as unknown as ExecutionContext;

        const result = await guard.canActivate(ctx);

        // resolves as 'GET /' which is public in the mocked registry
        expect(result).toBe(true);
        expect(jwtValidator.validate).not.toHaveBeenCalled();
      });
    });
  });

  describe('Given a route where the handler has no path metadata (undefined)', () => {
    describe('When the guard evaluates the request', () => {
      it('Then it falls back to empty string for handlerPath and resolves the key', async () => {
        const request: Record<string, unknown> = { headers: {}, user: undefined };
        const handler = jest.fn();
        // handler path metadata intentionally NOT set → undefined → falls back to ''
        Reflect.defineMetadata('method', GET, handler);
        const controllerClass = jest.fn();
        Reflect.defineMetadata('path', 'health', controllerClass);

        const ctx = {
          switchToHttp: () => ({ getRequest: () => request }),
          getHandler: () => handler,
          getClass: () => controllerClass,
        } as unknown as ExecutionContext;

        const result = await guard.canActivate(ctx);

        // resolves as 'GET /health' which is public in the mocked registry
        expect(result).toBe(true);
        expect(jwtValidator.validate).not.toHaveBeenCalled();
      });
    });
  });

  describe('Given a route where both controller and handler paths are empty', () => {
    describe('When the guard evaluates the request', () => {
      it('Then it resolves the key as GET / (the root path)', async () => {
        // Both empty → segments = [] → fullPath = '/' → key = 'GET /'
        const ctx = buildExecutionContext('', '', GET);
        const result = await guard.canActivate(ctx);

        // GET / is public in the mocked registry
        expect(result).toBe(true);
        expect(jwtValidator.validate).not.toHaveBeenCalled();
      });
    });
  });
});

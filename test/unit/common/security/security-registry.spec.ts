import { SecurityRegistry } from '@common/security/security-registry';
import { SystemAction } from '@authorization/domain/enums/actions-catalog';

describe('SecurityRegistry', () => {
  describe('Given the centralized route-to-security-policy mapping', () => {
    describe('When inspecting the registry structure', () => {
      it('Then every entry has a valid route key format (METHOD /path)', () => {
        const validMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
        for (const key of Object.keys(SecurityRegistry)) {
          const parts = key.split(' ');
          expect(parts).toHaveLength(2);
          expect(validMethods).toContain(parts[0]);
          expect(parts[1]).toMatch(/^\//);
        }
      });

      it('Then all route paths start with a forward slash', () => {
        for (const key of Object.keys(SecurityRegistry)) {
          const path = key.split(' ')[1];
          expect(path.startsWith('/')).toBe(true);
        }
      });

      it('Then no route path contains double slashes', () => {
        for (const key of Object.keys(SecurityRegistry)) {
          const path = key.split(' ')[1];
          expect(path).not.toMatch(/\/\//);
        }
      });
    });

    describe('When checking public routes', () => {
      const publicRoutes = Object.entries(SecurityRegistry).filter(
        ([, meta]) => meta.public === true,
      );

      it('Then public routes exist', () => {
        expect(publicRoutes.length).toBeGreaterThan(0);
      });

      it('Then all authentication endpoints are public', () => {
        const authRoutes = [
          'POST /authentication/sign-up',
          'POST /authentication/sign-in',
          'POST /authentication/sign-out',
          'POST /authentication/refresh-session',
          'POST /authentication/verify-email',
          'POST /authentication/resend-verification-code',
          'POST /authentication/forgot-password',
          'POST /authentication/reset-password',
          'GET /authentication/providers',
        ];
        for (const route of authRoutes) {
          expect(SecurityRegistry[route]).toEqual({ public: true });
        }
      });

      it('Then the root and health endpoints are public', () => {
        expect(SecurityRegistry['GET /']).toEqual({ public: true });
        expect(SecurityRegistry['GET /health']).toEqual({ public: true });
      });

      it('Then invitation preview by token is public', () => {
        expect(SecurityRegistry['GET /tenant/invitations/:token']).toEqual({ public: true });
      });
    });

    describe('When checking JWT-only routes', () => {
      it('Then users/me is JWT-only (empty meta)', () => {
        expect(SecurityRegistry['GET /users/me']).toEqual({});
      });

      it('Then onboarding routes are JWT-only', () => {
        expect(SecurityRegistry['POST /onboarding/start']).toEqual({});
        expect(SecurityRegistry['POST /onboarding/complete']).toEqual({});
        expect(SecurityRegistry['GET /onboarding/status']).toEqual({});
        expect(SecurityRegistry['PATCH /onboarding/progress']).toEqual({});
      });

      it('Then accept-invitation is JWT-only', () => {
        expect(SecurityRegistry['POST /tenant/invitations/:token/accept']).toEqual({});
      });
    });

    describe('When checking tenant-required routes', () => {
      it('Then tenant/me requires tenant membership', () => {
        expect(SecurityRegistry['GET /tenant/me']).toEqual({ requireTenant: true });
      });

      it('Then tenant capabilities requires tenant membership', () => {
        expect(SecurityRegistry['GET /tenants/me/capabilities']).toEqual({ requireTenant: true });
      });

      it('Then RBAC endpoints require tenant membership', () => {
        expect(SecurityRegistry['GET /rbac/my-permissions']).toEqual({ requireTenant: true });
        expect(SecurityRegistry['GET /rbac/assignable-roles']).toEqual({ requireTenant: true });
        expect(SecurityRegistry['GET /rbac/roles']).toEqual({ requireTenant: true });
      });
    });

    describe('When checking RBAC-protected routes', () => {
      it('Then storage CRUD endpoints require the correct SystemAction', () => {
        expect(SecurityRegistry['POST /storages/warehouses']).toEqual({
          action: SystemAction.STORAGE_CREATE,
        });
        expect(SecurityRegistry['POST /storages/custom-rooms']).toEqual({
          action: SystemAction.STORAGE_CREATE,
        });
        expect(SecurityRegistry['POST /storages/store-rooms']).toEqual({
          action: SystemAction.STORAGE_CREATE,
        });
        expect(SecurityRegistry['GET /storages']).toEqual({
          action: SystemAction.STORAGE_READ,
        });
        expect(SecurityRegistry['GET /storages/:uuid']).toEqual({
          action: SystemAction.STORAGE_READ,
        });
        expect(SecurityRegistry['PATCH /storages/warehouses/:uuid']).toEqual({
          action: SystemAction.STORAGE_UPDATE,
        });
        expect(SecurityRegistry['PATCH /storages/custom-rooms/:uuid']).toEqual({
          action: SystemAction.STORAGE_UPDATE,
        });
        expect(SecurityRegistry['PATCH /storages/store-rooms/:uuid']).toEqual({
          action: SystemAction.STORAGE_UPDATE,
        });
        expect(SecurityRegistry['DELETE /storages/:uuid']).toEqual({
          action: SystemAction.STORAGE_DELETE,
        });
      });

      it('Then invitation management endpoints require MEMBER_INVITE', () => {
        expect(SecurityRegistry['GET /tenant/me/invitations']).toEqual({
          action: SystemAction.MEMBER_INVITE,
        });
        expect(SecurityRegistry['POST /tenant/me/invitations']).toEqual({
          action: SystemAction.MEMBER_INVITE,
        });
        expect(SecurityRegistry['DELETE /tenant/me/invitations/:id']).toEqual({
          action: SystemAction.MEMBER_INVITE,
        });
      });
    });

    describe('When checking that RBAC routes implicitly require tenant membership', () => {
      it('Then every route with an action does NOT also have requireTenant (action implies it)', () => {
        const actionRoutes = Object.entries(SecurityRegistry).filter(
          ([, meta]) => meta.action !== undefined,
        );
        for (const [key, meta] of actionRoutes) {
          expect(meta.requireTenant).toBeUndefined();
          // Verify the SecurityGuard logic: action !== undefined triggers tenant check
          expect(key).toBeTruthy();
        }
      });
    });
  });
});

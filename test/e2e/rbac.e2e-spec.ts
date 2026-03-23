import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { getTenantWorkerApp, truncateTenantWorkerTables } from '@test/tenant-worker-app';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SignInResponse {
  accessToken: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function signUp(
  app: INestApplication,
  dataSource: DataSource,
  email: string,
  username: string,
): Promise<void> {
  await request(app.getHttpServer())
    .post('/api/authentication/sign-up')
    .send({ email, username, password: 'SecurePass1!' });
  await dataSource.query(
    `UPDATE "accounts"."credential_accounts"
     SET status = 'active', email_verified_at = NOW()
     WHERE LOWER(email) = LOWER($1)`,
    [email],
  );
}

async function signIn(app: INestApplication, email: string): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/api/authentication/sign-in')
    .send({ emailOrUsername: email, password: 'SecurePass1!' });
  return (res.body as SignInResponse).accessToken;
}

// ─── Spec ─────────────────────────────────────────────────────────────────────

describe('RBAC endpoints (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  const OWNER_EMAIL = 'rbac.owner.e2e@example.com';
  const OWNER_USERNAME = 'rbacownere2e';
  const NO_TENANT_EMAIL = 'rbac.notenant.e2e@example.com';
  const NO_TENANT_USERNAME = 'rbacnotenante2e';

  let ownerToken: string;
  let noTenantToken: string;

  beforeAll(async () => {
    const workerApp = await getTenantWorkerApp();
    app = workerApp.app;
    dataSource = workerApp.dataSource;

    await signUp(app, dataSource, OWNER_EMAIL, OWNER_USERNAME);
    await signUp(app, dataSource, NO_TENANT_EMAIL, NO_TENANT_USERNAME);

    // Sign in to get a pre-onboarding token
    const tempToken = await signIn(app, OWNER_EMAIL);

    // Complete onboarding — user becomes OWNER of a new tenant
    await request(app.getHttpServer())
      .post('/api/tenant/onboarding/complete')
      .set('Authorization', `Bearer ${tempToken}`)
      .send({
        name: 'RBAC Test Business',
        businessType: 'retail',
        country: 'MX',
        timezone: 'America/Mexico_City',
      });

    // Re-sign-in to obtain a token that carries tenantId
    ownerToken = await signIn(app, OWNER_EMAIL);
    noTenantToken = await signIn(app, NO_TENANT_EMAIL);
  });

  afterAll(async () => {
    await truncateTenantWorkerTables(dataSource);
  });

  // ── GET /api/rbac/roles ───────────────────────────────────────────────────

  describe('Given an authenticated user', () => {
    describe('When they request the role catalog', () => {
      it('Then it returns 200 with the full list of active system roles', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/rbac/roles')
          .set('Authorization', `Bearer ${ownerToken}`);

        expect(res.status).toBe(HttpStatus.OK);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThan(0);
        expect(res.body[0]).toMatchObject({
          key: expect.any(String),
          nameEn: expect.any(String),
          nameEs: expect.any(String),
          hierarchyLevel: expect.any(Number),
        });
      });
    });
  });

  describe('Given an unauthenticated client', () => {
    describe('When they call GET /api/rbac/roles', () => {
      it('Then it returns 401 Unauthorized', async () => {
        const res = await request(app.getHttpServer()).get('/api/rbac/roles');
        expect(res.status).toBe(HttpStatus.UNAUTHORIZED);
      });
    });
  });

  // ── GET /api/rbac/my-permissions ─────────────────────────────────────────

  describe('Given an authenticated OWNER with an active tenant membership', () => {
    describe('When they request their effective permissions', () => {
      it('Then it returns 200 with role, tier, allowed actions, and per-user grants', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/rbac/my-permissions')
          .set('Authorization', `Bearer ${ownerToken}`);

        expect(res.status).toBe(HttpStatus.OK);
        expect(res.body.role).toBe('OWNER');
        expect(res.body.tier).toBeDefined();
        expect(Array.isArray(res.body.actions)).toBe(true);
        expect(res.body.actions.length).toBeGreaterThan(0);
        expect(Array.isArray(res.body.grants)).toBe(true);
      });
    });

    describe('When they request their permissions a second time', () => {
      it('Then it returns 200 again (cache hit path in the policy adapter)', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/rbac/my-permissions')
          .set('Authorization', `Bearer ${ownerToken}`);

        expect(res.status).toBe(HttpStatus.OK);
        expect(res.body.role).toBe('OWNER');
      });
    });
  });

  describe('Given an authenticated user without any tenant membership', () => {
    describe('When they request their effective permissions', () => {
      it('Then it returns 403 with MEMBERSHIP_REQUIRED', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/rbac/my-permissions')
          .set('Authorization', `Bearer ${noTenantToken}`);

        expect(res.status).toBe(HttpStatus.FORBIDDEN);
        expect(res.body.error).toBe('MEMBERSHIP_REQUIRED');
      });
    });
  });

  describe('Given an unauthenticated client', () => {
    describe('When they call GET /api/rbac/my-permissions', () => {
      it('Then it returns 401 Unauthorized', async () => {
        const res = await request(app.getHttpServer()).get('/api/rbac/my-permissions');
        expect(res.status).toBe(HttpStatus.UNAUTHORIZED);
      });
    });
  });

  // ── GET /api/rbac/assignable-roles ───────────────────────────────────────

  describe('Given an authenticated VIEWER who has no roles to delegate', () => {
    let viewerToken: string;

    beforeAll(async () => {
      const VIEWER_EMAIL = 'rbac.viewer.e2e@example.com';
      const VIEWER_USERNAME = 'rbacviewere2e';

      await signUp(app, dataSource, VIEWER_EMAIL, VIEWER_USERNAME);

      // Look up the tenant integer ID for the RBAC test tenant
      const tenantRows: Array<{ id: number }> = await dataSource.query(
        `SELECT id FROM "tenants"."tenants" WHERE name = 'RBAC Test Business' LIMIT 1`,
      );
      const tenantId = tenantRows[0].id;

      // Look up the viewer user's integer ID and UUID
      const userRows: Array<{ id: number; uuid: string }> = await dataSource.query(
        `SELECT u.id, u.uuid FROM "identity"."users" u
         JOIN "accounts"."credential_accounts" ca ON ca.account_id = u.id
         WHERE LOWER(ca.email) = LOWER($1)
         LIMIT 1`,
        [VIEWER_EMAIL],
      );
      const userId = userRows[0].id;
      const userUUID = userRows[0].uuid;

      // Insert them directly as VIEWER (bypassing invitation flow)
      await dataSource.query(
        `INSERT INTO "tenants"."tenant_members" (uuid, tenant_id, user_id, user_uuid, role, status)
         VALUES (gen_random_uuid(), $1, $2, $3, 'VIEWER', 'active')`,
        [tenantId, userId, userUUID],
      );

      viewerToken = await signIn(app, VIEWER_EMAIL);
    });

    describe('When they request the roles they can assign', () => {
      it('Then it returns 200 with an empty list because VIEWER has no delegation rules', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/rbac/assignable-roles')
          .set('Authorization', `Bearer ${viewerToken}`);

        expect(res.status).toBe(HttpStatus.OK);
        expect(res.body).toEqual([]);
      });
    });
  });

  describe('Given an authenticated OWNER with an active tenant membership', () => {
    describe('When they request the roles they can assign', () => {
      it('Then it returns 200 with a list of assignable role descriptors', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/rbac/assignable-roles')
          .set('Authorization', `Bearer ${ownerToken}`);

        expect(res.status).toBe(HttpStatus.OK);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThan(0);
        expect(res.body[0]).toMatchObject({
          key: expect.any(String),
          nameEn: expect.any(String),
          nameEs: expect.any(String),
        });
      });
    });

    describe('When they request assignable roles a second time', () => {
      it('Then it returns 200 again (cache hit path in the policy adapter)', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/rbac/assignable-roles')
          .set('Authorization', `Bearer ${ownerToken}`);

        expect(res.status).toBe(HttpStatus.OK);
        expect(Array.isArray(res.body)).toBe(true);
      });
    });
  });

  describe('Given an authenticated user without any tenant membership', () => {
    describe('When they request assignable roles', () => {
      it('Then it returns 403 with MEMBERSHIP_REQUIRED', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/rbac/assignable-roles')
          .set('Authorization', `Bearer ${noTenantToken}`);

        expect(res.status).toBe(HttpStatus.FORBIDDEN);
        expect(res.body.error).toBe('MEMBERSHIP_REQUIRED');
      });
    });
  });

  describe('Given an unauthenticated client', () => {
    describe('When they call GET /api/rbac/assignable-roles', () => {
      it('Then it returns 401 Unauthorized', async () => {
        const res = await request(app.getHttpServer()).get('/api/rbac/assignable-roles');
        expect(res.status).toBe(HttpStatus.UNAUTHORIZED);
      });
    });
  });
});

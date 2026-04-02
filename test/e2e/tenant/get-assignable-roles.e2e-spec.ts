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

async function insertMemberDirectly(
  dataSource: DataSource,
  tenantName: string,
  memberEmail: string,
  role: string,
): Promise<void> {
  const tenantRows: Array<{ id: number }> = await dataSource.query(
    `SELECT id FROM "tenants"."tenants" WHERE name = $1 LIMIT 1`,
    [tenantName],
  );
  const tenantId = tenantRows[0].id;

  const userRows: Array<{ id: number; uuid: string }> = await dataSource.query(
    `SELECT u.id, u.uuid FROM "identity"."users" u
     JOIN "accounts"."credential_accounts" ca ON ca.account_id = u.id
     WHERE LOWER(ca.email) = LOWER($1)
     LIMIT 1`,
    [memberEmail],
  );
  const userId = userRows[0].id;
  const userUUID = userRows[0].uuid;

  await dataSource.query(
    `INSERT INTO "tenants"."tenant_members" (uuid, tenant_id, user_id, user_uuid, role, status)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, 'active')`,
    [tenantId, userId, userUUID, role],
  );
}

// ─── Spec ─────────────────────────────────────────────────────────────────────

describe('GET /api/rbac/assignable-roles (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  const TENANT_NAME = 'AssignableRoles Test Business';
  const OWNER_EMAIL = 'assignroles.owner.e2e@example.com';
  const OWNER_USERNAME = 'assignrolesownere2e';
  const NO_TENANT_EMAIL = 'assignroles.notenant.e2e@example.com';
  const NO_TENANT_USERNAME = 'assignrolesnotenante2e';

  let ownerToken: string;
  let noTenantToken: string;

  beforeAll(async () => {
    const workerApp = await getTenantWorkerApp();
    app = workerApp.app;
    dataSource = workerApp.dataSource;
    await truncateTenantWorkerTables(dataSource);

    await signUp(app, dataSource, OWNER_EMAIL, OWNER_USERNAME);
    await signUp(app, dataSource, NO_TENANT_EMAIL, NO_TENANT_USERNAME);

    const tempToken = await signIn(app, OWNER_EMAIL);

    await request(app.getHttpServer())
      .post('/api/tenant/onboarding/complete')
      .set('Authorization', `Bearer ${tempToken}`)
      .send({
        name: TENANT_NAME,
        businessType: 'retail',
        country: 'MX',
        timezone: 'America/Mexico_City',
      });

    ownerToken = await signIn(app, OWNER_EMAIL);
    noTenantToken = await signIn(app, NO_TENANT_EMAIL);
  });

  afterAll(async () => {
    await truncateTenantWorkerTables(dataSource);
  });

  // ── VIEWER — empty list ───────────────────────────────────────────────────

  describe('Given an authenticated VIEWER who has no roles to delegate', () => {
    let viewerToken: string;

    beforeAll(async () => {
      const VIEWER_EMAIL = 'assignroles.viewer.e2e@example.com';
      const VIEWER_USERNAME = 'assignrolesviewere2e';

      await signUp(app, dataSource, VIEWER_EMAIL, VIEWER_USERNAME);
      await insertMemberDirectly(dataSource, TENANT_NAME, VIEWER_EMAIL, 'VIEWER');
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

  // ── OWNER — full list ─────────────────────────────────────────────────────

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

  // ── MANAGER — exactly 4 roles ─────────────────────────────────────────────

  describe('Given an authenticated MANAGER with an active tenant membership', () => {
    let managerToken: string;

    beforeAll(async () => {
      const MANAGER_EMAIL = 'assignroles.manager.e2e@example.com';
      const MANAGER_USERNAME = 'assignrolesmanagere2e';

      await signUp(app, dataSource, MANAGER_EMAIL, MANAGER_USERNAME);
      await insertMemberDirectly(dataSource, TENANT_NAME, MANAGER_EMAIL, 'MANAGER');
      managerToken = await signIn(app, MANAGER_EMAIL);
    });

    describe('When they request the roles they can assign', () => {
      it('Then it returns 200 with exactly 4 assignable roles: BUYER, WAREHOUSE_KEEPER, SALES_REP, VIEWER', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/rbac/assignable-roles')
          .set('Authorization', `Bearer ${managerToken}`);

        expect(res.status).toBe(HttpStatus.OK);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body).toHaveLength(4);

        const keys: string[] = (res.body as Array<{ key: string }>).map((r) => r.key);
        expect(keys).toContain('BUYER');
        expect(keys).toContain('WAREHOUSE_KEEPER');
        expect(keys).toContain('SALES_REP');
        expect(keys).toContain('VIEWER');
      });
    });
  });

  // ── PARTNER — exactly 5 roles ─────────────────────────────────────────────

  describe('Given an authenticated PARTNER with an active tenant membership', () => {
    let partnerToken: string;

    beforeAll(async () => {
      const PARTNER_EMAIL = 'assignroles.partner.e2e@example.com';
      const PARTNER_USERNAME = 'assignrolespartnere2e';

      await signUp(app, dataSource, PARTNER_EMAIL, PARTNER_USERNAME);
      await insertMemberDirectly(dataSource, TENANT_NAME, PARTNER_EMAIL, 'PARTNER');
      partnerToken = await signIn(app, PARTNER_EMAIL);
    });

    describe('When they request the roles they can assign', () => {
      it('Then it returns 200 with exactly 5 assignable roles: MANAGER, BUYER, WAREHOUSE_KEEPER, SALES_REP, VIEWER', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/rbac/assignable-roles')
          .set('Authorization', `Bearer ${partnerToken}`);

        expect(res.status).toBe(HttpStatus.OK);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body).toHaveLength(5);

        const keys: string[] = (res.body as Array<{ key: string }>).map((r) => r.key);
        expect(keys).toContain('MANAGER');
        expect(keys).toContain('BUYER');
        expect(keys).toContain('WAREHOUSE_KEEPER');
        expect(keys).toContain('SALES_REP');
        expect(keys).toContain('VIEWER');
      });
    });
  });

  // ── No tenant membership ──────────────────────────────────────────────────

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

  // ── Unauthenticated ───────────────────────────────────────────────────────

  describe('Given an unauthenticated client', () => {
    describe('When they call GET /api/rbac/assignable-roles', () => {
      it('Then it returns 401 Unauthorized', async () => {
        const res = await request(app.getHttpServer()).get('/api/rbac/assignable-roles');
        expect(res.status).toBe(HttpStatus.UNAUTHORIZED);
      });
    });
  });
});

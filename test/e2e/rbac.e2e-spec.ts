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

  // ── my-permissions per role ───────────────────────────────────────────────

  describe('Given an authenticated PARTNER with an active tenant membership', () => {
    let partnerToken: string;

    beforeAll(async () => {
      const PARTNER_EMAIL = 'rbac.partner.e2e@example.com';
      const PARTNER_USERNAME = 'rbacpartnere2e';

      await signUp(app, dataSource, PARTNER_EMAIL, PARTNER_USERNAME);

      const tenantRows: Array<{ id: number }> = await dataSource.query(
        `SELECT id FROM "tenants"."tenants" WHERE name = 'RBAC Test Business' LIMIT 1`,
      );
      const tenantId = tenantRows[0].id;

      const userRows: Array<{ id: number; uuid: string }> = await dataSource.query(
        `SELECT u.id, u.uuid FROM "identity"."users" u
         JOIN "accounts"."credential_accounts" ca ON ca.account_id = u.id
         WHERE LOWER(ca.email) = LOWER($1)
         LIMIT 1`,
        [PARTNER_EMAIL],
      );
      const userId = userRows[0].id;
      const userUUID = userRows[0].uuid;

      await dataSource.query(
        `INSERT INTO "tenants"."tenant_members" (uuid, tenant_id, user_id, user_uuid, role, status)
         VALUES (gen_random_uuid(), $1, $2, $3, 'PARTNER', 'active')`,
        [tenantId, userId, userUUID],
      );

      partnerToken = await signIn(app, PARTNER_EMAIL);
    });

    describe('When they request their effective permissions', () => {
      it('Then it returns 200 with PARTNER role and 16 specific actions', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/rbac/my-permissions')
          .set('Authorization', `Bearer ${partnerToken}`);

        expect(res.status).toBe(HttpStatus.OK);
        expect(res.body.role).toBe('PARTNER');
        expect(res.body.actions).toHaveLength(16);
        expect(res.body.actions).toContain('STORAGE_CREATE');
        expect(res.body.actions).toContain('STORAGE_READ');
        expect(res.body.actions).toContain('STORAGE_UPDATE');
        expect(res.body.actions).toContain('STORAGE_DELETE');
        expect(res.body.actions).toContain('MEMBER_INVITE');
        expect(res.body.actions).toContain('MEMBER_READ');
        expect(res.body.actions).toContain('MEMBER_UPDATE_ROLE');
        expect(res.body.actions).toContain('MEMBER_REMOVE');
        expect(res.body.actions).toContain('PRODUCT_CREATE');
        expect(res.body.actions).toContain('PRODUCT_READ');
        expect(res.body.actions).toContain('PRODUCT_UPDATE');
        expect(res.body.actions).toContain('PRODUCT_DELETE');
        expect(res.body.actions).toContain('REPORT_READ');
        expect(res.body.actions).toContain('REPORT_ADVANCED');
        expect(res.body.actions).toContain('INVENTORY_EXPORT');
        expect(res.body.actions).toContain('TENANT_SETTINGS_READ');
        expect(res.body.actions).not.toContain('TENANT_SETTINGS_UPDATE');
      });
    });
  });

  describe('Given an authenticated MANAGER with an active tenant membership', () => {
    let managerToken: string;

    beforeAll(async () => {
      const MANAGER_EMAIL = 'rbac.manager.e2e@example.com';
      const MANAGER_USERNAME = 'rbacmanagere2e';

      await signUp(app, dataSource, MANAGER_EMAIL, MANAGER_USERNAME);

      const tenantRows: Array<{ id: number }> = await dataSource.query(
        `SELECT id FROM "tenants"."tenants" WHERE name = 'RBAC Test Business' LIMIT 1`,
      );
      const tenantId = tenantRows[0].id;

      const userRows: Array<{ id: number; uuid: string }> = await dataSource.query(
        `SELECT u.id, u.uuid FROM "identity"."users" u
         JOIN "accounts"."credential_accounts" ca ON ca.account_id = u.id
         WHERE LOWER(ca.email) = LOWER($1)
         LIMIT 1`,
        [MANAGER_EMAIL],
      );
      const userId = userRows[0].id;
      const userUUID = userRows[0].uuid;

      await dataSource.query(
        `INSERT INTO "tenants"."tenant_members" (uuid, tenant_id, user_id, user_uuid, role, status)
         VALUES (gen_random_uuid(), $1, $2, $3, 'MANAGER', 'active')`,
        [tenantId, userId, userUUID],
      );

      managerToken = await signIn(app, MANAGER_EMAIL);
    });

    describe('When they request their effective permissions', () => {
      it('Then it returns 200 with MANAGER role and 14 specific actions', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/rbac/my-permissions')
          .set('Authorization', `Bearer ${managerToken}`);

        expect(res.status).toBe(HttpStatus.OK);
        expect(res.body.role).toBe('MANAGER');
        expect(res.body.actions).toHaveLength(14);
        expect(res.body.actions).toContain('STORAGE_CREATE');
        expect(res.body.actions).toContain('STORAGE_READ');
        expect(res.body.actions).toContain('STORAGE_UPDATE');
        expect(res.body.actions).toContain('STORAGE_DELETE');
        expect(res.body.actions).toContain('MEMBER_INVITE');
        expect(res.body.actions).toContain('MEMBER_READ');
        expect(res.body.actions).toContain('PRODUCT_CREATE');
        expect(res.body.actions).toContain('PRODUCT_READ');
        expect(res.body.actions).toContain('PRODUCT_UPDATE');
        expect(res.body.actions).toContain('PRODUCT_DELETE');
        expect(res.body.actions).toContain('REPORT_READ');
        expect(res.body.actions).toContain('REPORT_ADVANCED');
        expect(res.body.actions).toContain('INVENTORY_EXPORT');
        expect(res.body.actions).toContain('TENANT_SETTINGS_READ');
        expect(res.body.actions).not.toContain('MEMBER_UPDATE_ROLE');
        expect(res.body.actions).not.toContain('MEMBER_REMOVE');
        expect(res.body.actions).not.toContain('TENANT_SETTINGS_UPDATE');
      });
    });
  });

  describe('Given an authenticated BUYER with an active tenant membership', () => {
    let buyerToken: string;

    beforeAll(async () => {
      const BUYER_EMAIL = 'rbac.buyer.e2e@example.com';
      const BUYER_USERNAME = 'rbacbuyere2e';

      await signUp(app, dataSource, BUYER_EMAIL, BUYER_USERNAME);

      const tenantRows: Array<{ id: number }> = await dataSource.query(
        `SELECT id FROM "tenants"."tenants" WHERE name = 'RBAC Test Business' LIMIT 1`,
      );
      const tenantId = tenantRows[0].id;

      const userRows: Array<{ id: number; uuid: string }> = await dataSource.query(
        `SELECT u.id, u.uuid FROM "identity"."users" u
         JOIN "accounts"."credential_accounts" ca ON ca.account_id = u.id
         WHERE LOWER(ca.email) = LOWER($1)
         LIMIT 1`,
        [BUYER_EMAIL],
      );
      const userId = userRows[0].id;
      const userUUID = userRows[0].uuid;

      await dataSource.query(
        `INSERT INTO "tenants"."tenant_members" (uuid, tenant_id, user_id, user_uuid, role, status)
         VALUES (gen_random_uuid(), $1, $2, $3, 'BUYER', 'active')`,
        [tenantId, userId, userUUID],
      );

      buyerToken = await signIn(app, BUYER_EMAIL);
    });

    describe('When they request their effective permissions', () => {
      it('Then it returns 200 with BUYER role and 5 specific actions', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/rbac/my-permissions')
          .set('Authorization', `Bearer ${buyerToken}`);

        expect(res.status).toBe(HttpStatus.OK);
        expect(res.body.role).toBe('BUYER');
        expect(res.body.actions).toHaveLength(5);
        expect(res.body.actions).toContain('PRODUCT_CREATE');
        expect(res.body.actions).toContain('PRODUCT_READ');
        expect(res.body.actions).toContain('PRODUCT_UPDATE');
        expect(res.body.actions).toContain('REPORT_READ');
        expect(res.body.actions).toContain('TENANT_SETTINGS_READ');
      });
    });
  });

  describe('Given an authenticated WAREHOUSE_KEEPER with an active tenant membership', () => {
    let warehouseKeeperToken: string;

    beforeAll(async () => {
      const WAREHOUSE_KEEPER_EMAIL = 'rbac.warehousekeeper.e2e@example.com';
      const WAREHOUSE_KEEPER_USERNAME = 'rbacwarehousekeepere2e';

      await signUp(app, dataSource, WAREHOUSE_KEEPER_EMAIL, WAREHOUSE_KEEPER_USERNAME);

      const tenantRows: Array<{ id: number }> = await dataSource.query(
        `SELECT id FROM "tenants"."tenants" WHERE name = 'RBAC Test Business' LIMIT 1`,
      );
      const tenantId = tenantRows[0].id;

      const userRows: Array<{ id: number; uuid: string }> = await dataSource.query(
        `SELECT u.id, u.uuid FROM "identity"."users" u
         JOIN "accounts"."credential_accounts" ca ON ca.account_id = u.id
         WHERE LOWER(ca.email) = LOWER($1)
         LIMIT 1`,
        [WAREHOUSE_KEEPER_EMAIL],
      );
      const userId = userRows[0].id;
      const userUUID = userRows[0].uuid;

      await dataSource.query(
        `INSERT INTO "tenants"."tenant_members" (uuid, tenant_id, user_id, user_uuid, role, status)
         VALUES (gen_random_uuid(), $1, $2, $3, 'WAREHOUSE_KEEPER', 'active')`,
        [tenantId, userId, userUUID],
      );

      warehouseKeeperToken = await signIn(app, WAREHOUSE_KEEPER_EMAIL);
    });

    describe('When they request their effective permissions', () => {
      it('Then it returns 200 with WAREHOUSE_KEEPER role and 7 specific actions', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/rbac/my-permissions')
          .set('Authorization', `Bearer ${warehouseKeeperToken}`);

        expect(res.status).toBe(HttpStatus.OK);
        expect(res.body.role).toBe('WAREHOUSE_KEEPER');
        expect(res.body.actions).toHaveLength(7);
        expect(res.body.actions).toContain('STORAGE_READ');
        expect(res.body.actions).toContain('STORAGE_UPDATE');
        expect(res.body.actions).toContain('PRODUCT_READ');
        expect(res.body.actions).toContain('PRODUCT_UPDATE');
        expect(res.body.actions).toContain('INVENTORY_EXPORT');
        expect(res.body.actions).toContain('REPORT_READ');
        expect(res.body.actions).toContain('TENANT_SETTINGS_READ');
      });
    });
  });

  describe('Given an authenticated SALES_REP with an active tenant membership', () => {
    let salesRepToken: string;

    beforeAll(async () => {
      const SALES_REP_EMAIL = 'rbac.salesrep.e2e@example.com';
      const SALES_REP_USERNAME = 'rbacsalesrepe2e';

      await signUp(app, dataSource, SALES_REP_EMAIL, SALES_REP_USERNAME);

      const tenantRows: Array<{ id: number }> = await dataSource.query(
        `SELECT id FROM "tenants"."tenants" WHERE name = 'RBAC Test Business' LIMIT 1`,
      );
      const tenantId = tenantRows[0].id;

      const userRows: Array<{ id: number; uuid: string }> = await dataSource.query(
        `SELECT u.id, u.uuid FROM "identity"."users" u
         JOIN "accounts"."credential_accounts" ca ON ca.account_id = u.id
         WHERE LOWER(ca.email) = LOWER($1)
         LIMIT 1`,
        [SALES_REP_EMAIL],
      );
      const userId = userRows[0].id;
      const userUUID = userRows[0].uuid;

      await dataSource.query(
        `INSERT INTO "tenants"."tenant_members" (uuid, tenant_id, user_id, user_uuid, role, status)
         VALUES (gen_random_uuid(), $1, $2, $3, 'SALES_REP', 'active')`,
        [tenantId, userId, userUUID],
      );

      salesRepToken = await signIn(app, SALES_REP_EMAIL);
    });

    describe('When they request their effective permissions', () => {
      it('Then it returns 200 with SALES_REP role and 3 specific actions', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/rbac/my-permissions')
          .set('Authorization', `Bearer ${salesRepToken}`);

        expect(res.status).toBe(HttpStatus.OK);
        expect(res.body.role).toBe('SALES_REP');
        expect(res.body.actions).toHaveLength(3);
        expect(res.body.actions).toContain('PRODUCT_READ');
        expect(res.body.actions).toContain('REPORT_READ');
        expect(res.body.actions).toContain('TENANT_SETTINGS_READ');
      });
    });
  });

  // ── assignable-roles per role ─────────────────────────────────────────────

  describe('Given an authenticated MANAGER with an active tenant membership', () => {
    describe('When they request the roles they can assign', () => {
      it('Then it returns 200 with exactly 4 assignable roles: BUYER, WAREHOUSE_KEEPER, SALES_REP, VIEWER', async () => {
        const MANAGER_EMAIL = 'rbac.manager.e2e@example.com';
        const managerToken = await signIn(app, MANAGER_EMAIL);

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

  describe('Given an authenticated PARTNER with an active tenant membership', () => {
    describe('When they request the roles they can assign', () => {
      it('Then it returns 200 with exactly 5 assignable roles: MANAGER, BUYER, WAREHOUSE_KEEPER, SALES_REP, VIEWER', async () => {
        const PARTNER_EMAIL = 'rbac.partner.e2e@example.com';
        const partnerToken = await signIn(app, PARTNER_EMAIL);

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
});

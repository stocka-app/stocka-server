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

describe('GET /api/rbac/my-permissions (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  const TENANT_NAME = 'MyPermissions Test Business';
  const OWNER_EMAIL = 'myperm.owner.e2e@example.com';
  const OWNER_USERNAME = 'mypermownere2e';
  const NO_TENANT_EMAIL = 'myperm.notenant.e2e@example.com';
  const NO_TENANT_USERNAME = 'mypermnotenante2e';

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

  // ── OWNER ─────────────────────────────────────────────────────────────────

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

  // ── No tenant membership ──────────────────────────────────────────────────

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

  // ── Unauthenticated ───────────────────────────────────────────────────────

  describe('Given an unauthenticated client', () => {
    describe('When they call GET /api/rbac/my-permissions', () => {
      it('Then it returns 401 Unauthorized', async () => {
        const res = await request(app.getHttpServer()).get('/api/rbac/my-permissions');
        expect(res.status).toBe(HttpStatus.UNAUTHORIZED);
      });
    });
  });

  // ── PARTNER ───────────────────────────────────────────────────────────────

  describe('Given an authenticated PARTNER with an active tenant membership', () => {
    let partnerToken: string;

    beforeAll(async () => {
      const PARTNER_EMAIL = 'myperm.partner.e2e@example.com';
      const PARTNER_USERNAME = 'mypermpartnere2e';

      await signUp(app, dataSource, PARTNER_EMAIL, PARTNER_USERNAME);
      await insertMemberDirectly(dataSource, TENANT_NAME, PARTNER_EMAIL, 'PARTNER');
      partnerToken = await signIn(app, PARTNER_EMAIL);
    });

    describe('When they request their effective permissions', () => {
      it('Then it returns 200 with PARTNER role and 18 specific actions', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/rbac/my-permissions')
          .set('Authorization', `Bearer ${partnerToken}`);

        expect(res.status).toBe(HttpStatus.OK);
        expect(res.body.role).toBe('PARTNER');
        expect(res.body.actions).toHaveLength(18);
        expect(res.body.actions).toContain('STORAGE_CREATE');
        expect(res.body.actions).toContain('STORAGE_READ');
        expect(res.body.actions).toContain('STORAGE_UPDATE');
        expect(res.body.actions).toContain('STORAGE_DELETE');
        expect(res.body.actions).toContain('STORAGE_FREEZE');
        expect(res.body.actions).toContain('STORAGE_ARCHIVE');
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

  // ── MANAGER ───────────────────────────────────────────────────────────────

  describe('Given an authenticated MANAGER with an active tenant membership', () => {
    let managerToken: string;

    beforeAll(async () => {
      const MANAGER_EMAIL = 'myperm.manager.e2e@example.com';
      const MANAGER_USERNAME = 'mypermmanagere2e';

      await signUp(app, dataSource, MANAGER_EMAIL, MANAGER_USERNAME);
      await insertMemberDirectly(dataSource, TENANT_NAME, MANAGER_EMAIL, 'MANAGER');
      managerToken = await signIn(app, MANAGER_EMAIL);
    });

    describe('When they request their effective permissions', () => {
      it('Then it returns 200 with MANAGER role and 16 specific actions', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/rbac/my-permissions')
          .set('Authorization', `Bearer ${managerToken}`);

        expect(res.status).toBe(HttpStatus.OK);
        expect(res.body.role).toBe('MANAGER');
        expect(res.body.actions).toHaveLength(16);
        expect(res.body.actions).toContain('STORAGE_CREATE');
        expect(res.body.actions).toContain('STORAGE_READ');
        expect(res.body.actions).toContain('STORAGE_UPDATE');
        expect(res.body.actions).toContain('STORAGE_DELETE');
        expect(res.body.actions).toContain('STORAGE_FREEZE');
        expect(res.body.actions).toContain('STORAGE_ARCHIVE');
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

  // ── BUYER ─────────────────────────────────────────────────────────────────

  describe('Given an authenticated BUYER with an active tenant membership', () => {
    let buyerToken: string;

    beforeAll(async () => {
      const BUYER_EMAIL = 'myperm.buyer.e2e@example.com';
      const BUYER_USERNAME = 'mypermbuyere2e';

      await signUp(app, dataSource, BUYER_EMAIL, BUYER_USERNAME);
      await insertMemberDirectly(dataSource, TENANT_NAME, BUYER_EMAIL, 'BUYER');
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

  // ── WAREHOUSE_KEEPER ──────────────────────────────────────────────────────

  describe('Given an authenticated WAREHOUSE_KEEPER with an active tenant membership', () => {
    let warehouseKeeperToken: string;

    beforeAll(async () => {
      const WAREHOUSE_KEEPER_EMAIL = 'myperm.warehousekeeper.e2e@example.com';
      const WAREHOUSE_KEEPER_USERNAME = 'mypermwarehousekeepere2e';

      await signUp(app, dataSource, WAREHOUSE_KEEPER_EMAIL, WAREHOUSE_KEEPER_USERNAME);
      await insertMemberDirectly(dataSource, TENANT_NAME, WAREHOUSE_KEEPER_EMAIL, 'WAREHOUSE_KEEPER');
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

  // ── SALES_REP ─────────────────────────────────────────────────────────────

  describe('Given an authenticated SALES_REP with an active tenant membership', () => {
    let salesRepToken: string;

    beforeAll(async () => {
      const SALES_REP_EMAIL = 'myperm.salesrep.e2e@example.com';
      const SALES_REP_USERNAME = 'mypermsalesrepe2e';

      await signUp(app, dataSource, SALES_REP_EMAIL, SALES_REP_USERNAME);
      await insertMemberDirectly(dataSource, TENANT_NAME, SALES_REP_EMAIL, 'SALES_REP');
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

  // ── Per-user permission grants ────────────────────────────────────────────
  // getUserGrants() only calls the .map() anonymous fn when there's at least
  // one row in authz.user_permission_grants. Normal test flows have 0 rows.

  describe('Given a user with a per-user permission grant inserted in the DB', () => {
    let grantUserToken: string;
    const GRANT_EMAIL = 'myperm.grant.e2e@example.com';
    const GRANT_USERNAME = 'mypermgrante2e';

    beforeAll(async () => {
      await signUp(app, dataSource, GRANT_EMAIL, GRANT_USERNAME);
      await insertMemberDirectly(dataSource, TENANT_NAME, GRANT_EMAIL, 'VIEWER');

      const rows: Array<{ tenant_id: number; user_id: number }> = await dataSource.query(
        `SELECT tm.tenant_id, tm.user_id
         FROM "tenants"."tenant_members" tm
         JOIN "tenants"."tenants" t ON t.id = tm.tenant_id
         JOIN "identity"."users" u ON u.id = tm.user_id
         JOIN "accounts"."credential_accounts" ca ON ca.account_id = u.id
         WHERE LOWER(ca.email) = LOWER($1) AND t.name = $2
         LIMIT 1`,
        [GRANT_EMAIL, TENANT_NAME],
      );
      const { tenant_id, user_id } = rows[0];

      await dataSource.query(
        `INSERT INTO "authz"."user_permission_grants" (tenant_id, user_id, action_key, granted_by)
         VALUES ($1, $2, 'STORAGE_READ', $2)`,
        [tenant_id, user_id],
      );

      grantUserToken = await signIn(app, GRANT_EMAIL);
    });

    describe('When they request their effective permissions', () => {
      it('Then it returns 200 and the grants array includes the per-user grant', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/rbac/my-permissions')
          .set('Authorization', `Bearer ${grantUserToken}`);

        expect(res.status).toBe(HttpStatus.OK);
        expect(Array.isArray(res.body.grants)).toBe(true);
        expect(res.body.grants).toContain('STORAGE_READ');
      });
    });
  });
});

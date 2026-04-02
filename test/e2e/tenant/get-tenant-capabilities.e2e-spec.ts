import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { getTenantWorkerApp, truncateTenantWorkerTables } from '@test/tenant-worker-app';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { IRbacPolicyPort } from '@authorization/domain/contracts/rbac-policy.port';

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
    `UPDATE "accounts"."credential_accounts" SET status = 'active', email_verified_at = NOW() WHERE LOWER(email) = LOWER($1)`,
    [email],
  );
}

async function signIn(app: INestApplication, email: string): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/api/authentication/sign-in')
    .send({ emailOrUsername: email, password: 'SecurePass1!' });
  return (res.body as SignInResponse).accessToken;
}

async function completeOnboarding(app: INestApplication, token: string): Promise<void> {
  await request(app.getHttpServer())
    .post('/api/tenant/onboarding/complete')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: 'Capabilities Test Tenant',
      businessType: 'retail',
      country: 'MX',
      timezone: 'America/Mexico_City',
    });
}

// ─── Spec ─────────────────────────────────────────────────────────────────────

describe('GET /api/tenants/me/capabilities (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  const USER_EMAIL = 'capabilities.e2e@example.com';
  const USER_USERNAME = 'capsusere2e';

  beforeAll(async () => {
    const workerApp = await getTenantWorkerApp();
    app = workerApp.app;
    dataSource = workerApp.dataSource;
  });

  afterAll(async () => {
    await truncateTenantWorkerTables(dataSource);
  });

  beforeEach(async () => {
    if (dataSource?.isInitialized) {
      await truncateTenantWorkerTables(dataSource);
    }
  });

  describe('Given a request with no authorization token', () => {
    it('Then the endpoint returns 401 Unauthorized', async () => {
      const res = await request(app.getHttpServer()).get('/api/tenants/me/capabilities');
      expect(res.status).toBe(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('Given an authenticated user who has not yet completed onboarding (no tenant)', () => {
    it('Then the guard blocks access with 403 MEMBERSHIP_REQUIRED', async () => {
      await signUp(app, dataSource, USER_EMAIL, USER_USERNAME);
      const token = await signIn(app, USER_EMAIL);

      const res = await request(app.getHttpServer())
        .get('/api/tenants/me/capabilities')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(HttpStatus.FORBIDDEN);
      expect(res.body.error).toBe('MEMBERSHIP_REQUIRED');
    });
  });

  describe('Given an authenticated user with an active tenant', () => {
    it('Then the endpoint returns 200 with the tier limits for the tenant', async () => {
      await signUp(app, dataSource, USER_EMAIL, USER_USERNAME);
      const tokenBeforeOnboarding = await signIn(app, USER_EMAIL);
      await completeOnboarding(app, tokenBeforeOnboarding);

      // Re-sign in to get a fresh token that includes tenantId
      const token = await signIn(app, USER_EMAIL);

      const res = await request(app.getHttpServer())
        .get('/api/tenants/me/capabilities')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(HttpStatus.OK);
      expect(res.body.tier).toBeDefined();
      expect(typeof res.body.maxWarehouses).toBe('number');
      expect(typeof res.body.maxCustomRooms).toBe('number');
      expect(typeof res.body.maxStoreRooms).toBe('number');
    });
  });

  describe('Given an authenticated user with an active tenant on STARTER tier', () => {
    it('Then the endpoint returns 200 with STARTER tier limits', async () => {
      const STARTER_EMAIL = 'capabilities.starter@example.com';
      const STARTER_USERNAME = 'capsstartere2e';

      await signUp(app, dataSource, STARTER_EMAIL, STARTER_USERNAME);
      const tempToken = await signIn(app, STARTER_EMAIL);
      await completeOnboarding(app, tempToken);

      // Upgrade to STARTER
      await dataSource.query(
        `UPDATE "tenants"."tenant_config" tc
         SET tier = 'STARTER',
             max_warehouses = 3,
             max_custom_rooms = 5,
             max_store_rooms = 5,
             max_users = 10
         FROM "tenants"."tenant_members" tm
           JOIN "identity"."users" u ON u.id = tm.user_id
           JOIN "accounts"."credential_accounts" ca ON ca.account_id = u.id
         WHERE tm.tenant_id = tc.tenant_id
           AND tm.role = 'OWNER'
           AND tm.archived_at IS NULL
           AND LOWER(ca.email) = LOWER($1)`,
        [STARTER_EMAIL],
      );

      const token = await signIn(app, STARTER_EMAIL);

      const res = await request(app.getHttpServer())
        .get('/api/tenants/me/capabilities')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(HttpStatus.OK);
      expect(res.body.tier).toBe('STARTER');
      expect(res.body.maxWarehouses).toBe(3);
      expect(res.body.maxCustomRooms).toBe(5);
      expect(res.body.maxStoreRooms).toBe(5);
    });
  });

  describe('Given an authenticated user calling capabilities twice', () => {
    it('Then both calls return 200 (exercises the facade twice)', async () => {
      const CACHE_EMAIL = 'capabilities.cache@example.com';
      const CACHE_USERNAME = 'capscachee2e';

      await signUp(app, dataSource, CACHE_EMAIL, CACHE_USERNAME);
      const tempToken = await signIn(app, CACHE_EMAIL);
      await completeOnboarding(app, tempToken);
      const token = await signIn(app, CACHE_EMAIL);

      const res1 = await request(app.getHttpServer())
        .get('/api/tenants/me/capabilities')
        .set('Authorization', `Bearer ${token}`);

      const res2 = await request(app.getHttpServer())
        .get('/api/tenants/me/capabilities')
        .set('Authorization', `Bearer ${token}`);

      expect(res1.status).toBe(HttpStatus.OK);
      expect(res2.status).toBe(HttpStatus.OK);
      expect(res1.body.tier).toBe(res2.body.tier);
    });
  });

  // ── getTierNumericLimits ?? fallbacks (L110-112) ──────────────────────────
  // The ?? fallbacks for max_warehouses/max_users/max_products are only used
  // when the tier_plans row has NULL for those columns (e.g. an unlimited tier).

  describe('Given a tier with all NULL numeric limits in tier_plans', () => {
    const NULL_TIER = 'NULL_LIMIT_TEST';

    beforeAll(async () => {
      await dataSource.query(`
        INSERT INTO "tiers"."tier_plans" (tier, name, policy_version, max_products, max_users, max_warehouses)
        VALUES ($1, 'NULL Limit Test Tier', NOW(), NULL, NULL, NULL)
        ON CONFLICT (tier) DO NOTHING
      `, [NULL_TIER]);
    });

    afterAll(async () => {
      await dataSource.query(`DELETE FROM "tiers"."tier_plans" WHERE tier = $1`, [NULL_TIER]);
    });

    describe('When getTierNumericLimits is called for that tier', () => {
      it('Then it returns the ?? fallback values: storageCount=0, memberCount=1, productCount=100', async () => {
        // Clear cache to force a fresh DB read
        app.get<any>(INJECTION_TOKENS.RBAC_POLICY_PORT).cache.clear();

        const rbacPort = app.get<IRbacPolicyPort>(INJECTION_TOKENS.RBAC_POLICY_PORT);
        const limits = await rbacPort.getTierNumericLimits(NULL_TIER);

        expect(limits.storageCount).toBe(0);    // max_warehouses ?? 0
        expect(limits.memberCount).toBe(1);     // max_users ?? 1
        expect(limits.productCount).toBe(100);  // max_products ?? 100
      });
    });
  });
});

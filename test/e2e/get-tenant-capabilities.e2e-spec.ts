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
    it('Then the endpoint returns 404 with a tenant-not-found message', async () => {
      await signUp(app, dataSource, USER_EMAIL, USER_USERNAME);
      const token = await signIn(app, USER_EMAIL);

      const res = await request(app.getHttpServer())
        .get('/api/tenants/me/capabilities')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(HttpStatus.NOT_FOUND);
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
});

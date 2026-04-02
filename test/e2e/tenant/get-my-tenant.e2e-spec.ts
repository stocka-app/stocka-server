import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { getTenantWorkerApp, truncateTenantWorkerTables } from '@test/tenant-worker-app';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SignInResponse {
  accessToken: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function signUp(app: INestApplication, dataSource: DataSource, email: string, username: string): Promise<void> {
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
      name: 'My Test Tenant',
      businessType: 'retail',
      country: 'MX',
      timezone: 'America/Mexico_City',
    });
}

// ─── Spec ─────────────────────────────────────────────────────────────────────

describe('GET /api/tenant/me (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  const USER_EMAIL = 'get-my-tenant.e2e@example.com';
  const USER_USERNAME = 'getmytenante2e';

  beforeAll(async () => {
    const workerApp = await getTenantWorkerApp();
    app = workerApp.app;
    dataSource = workerApp.dataSource;
    await truncateTenantWorkerTables(dataSource);
    await signUp(app, dataSource, USER_EMAIL, USER_USERNAME);
  });

  afterAll(async () => {
    await truncateTenantWorkerTables(dataSource);
    await app.close();
  });

  describe('Given an authenticated user with a completed tenant', () => {
    let token: string;

    beforeAll(async () => {
      token = await signIn(app, USER_EMAIL);
      await completeOnboarding(app, token);
      token = await signIn(app, USER_EMAIL);
    });

    describe('When they request GET /api/tenant/me', () => {
      it('Then it returns 200 with the tenant data', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/tenant/me')
          .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(HttpStatus.OK);
        expect(res.body).toMatchObject({
          name: 'My Test Tenant',
          businessType: 'retail',
          country: 'MX',
          timezone: 'America/Mexico_City',
          status: 'active',
          tier: 'FREE',
        });
        expect(typeof res.body.uuid).toBe('string');
        expect(typeof res.body.slug).toBe('string');
      });
    });
  });

  describe('Given an unauthenticated request', () => {
    describe('When they request GET /api/tenant/me without a token', () => {
      it('Then it returns 401', async () => {
        const res = await request(app.getHttpServer()).get('/api/tenant/me');
        expect(res.status).toBe(HttpStatus.UNAUTHORIZED);
      });
    });
  });
});

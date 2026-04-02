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

describe('GET /api/rbac/roles (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  const OWNER_EMAIL = 'getroles.owner.e2e@example.com';
  const OWNER_USERNAME = 'getrolesownere2e';

  let ownerToken: string;

  beforeAll(async () => {
    const workerApp = await getTenantWorkerApp();
    app = workerApp.app;
    dataSource = workerApp.dataSource;
    await truncateTenantWorkerTables(dataSource);

    await signUp(app, dataSource, OWNER_EMAIL, OWNER_USERNAME);

    const tempToken = await signIn(app, OWNER_EMAIL);

    await request(app.getHttpServer())
      .post('/api/tenant/onboarding/complete')
      .set('Authorization', `Bearer ${tempToken}`)
      .send({
        name: 'GetRoles Test Business',
        businessType: 'retail',
        country: 'MX',
        timezone: 'America/Mexico_City',
      });

    ownerToken = await signIn(app, OWNER_EMAIL);
  });

  afterAll(async () => {
    await truncateTenantWorkerTables(dataSource);
  });

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
});

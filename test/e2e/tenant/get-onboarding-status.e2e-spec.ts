import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import {
  getOnboardingWorkerApp,
  truncateOnboardingWorkerTables,
} from '@test/onboarding-worker-app';

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

describe('GET /api/onboarding/status (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const workerApp = await getOnboardingWorkerApp();
    app = workerApp.app;
    dataSource = workerApp.dataSource;
  });

  afterAll(async () => {
    await truncateOnboardingWorkerTables(dataSource);
  });

  describe('Given an unauthenticated request', () => {
    describe('When GET /api/onboarding/status is called without auth', () => {
      it('Then it returns 401 Unauthorized', async () => {
        const res = await request(app.getHttpServer()).get('/api/onboarding/status');

        expect(res.status).toBe(HttpStatus.UNAUTHORIZED);
      });
    });
  });

  describe('Given an authenticated user with no existing onboarding session', () => {
    const EMAIL = 'getstatus.nosession@example.com';
    const USERNAME = 'getstatusnosession';
    let accessToken: string;

    beforeAll(async () => {
      await truncateOnboardingWorkerTables(dataSource);
      await signUp(app, dataSource, EMAIL, USERNAME);
      accessToken = await signIn(app, EMAIL);
    });

    describe('When GET /api/onboarding/status is called', () => {
      it('Then it returns 200 with null fields', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/onboarding/status')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(HttpStatus.OK);
        expect(res.body).toMatchObject({
          status: null,
          currentStep: null,
          path: null,
          stepData: null,
        });
      });
    });
  });

  describe('Given an authenticated user who has completed onboarding', () => {
    const EMAIL = 'getstatus.completed@example.com';
    const USERNAME = 'getstatuscompleted';
    let accessToken: string;

    beforeAll(async () => {
      await truncateOnboardingWorkerTables(dataSource);
      await signUp(app, dataSource, EMAIL, USERNAME);
      accessToken = await signIn(app, EMAIL);

      await request(app.getHttpServer())
        .post('/api/onboarding/start')
        .set('Authorization', `Bearer ${accessToken}`);

      await request(app.getHttpServer())
        .patch('/api/onboarding/progress')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ section: 'preferences', data: { locale: 'es', currency: 'MXN' } });

      await request(app.getHttpServer())
        .patch('/api/onboarding/progress')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ section: 'path', data: { path: 'CREATE' } });

      await request(app.getHttpServer())
        .patch('/api/onboarding/progress')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          section: 'businessProfile',
          data: {
            name: 'Status After Complete Biz',
            businessType: 'retail',
            country: 'MX',
            timezone: 'America/Mexico_City',
          },
        });

      await request(app.getHttpServer())
        .post('/api/onboarding/complete')
        .set('Authorization', `Bearer ${accessToken}`);
    });

    describe('When GET /api/onboarding/status is called after completion', () => {
      it('Then it returns 200 with COMPLETED status', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/onboarding/status')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(HttpStatus.OK);
        expect(res.body).toMatchObject({
          status: 'COMPLETED',
        });
      });
    });
  });
});

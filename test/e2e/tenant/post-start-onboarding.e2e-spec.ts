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

describe('POST /api/onboarding/start (e2e)', () => {
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

  describe('Given an authenticated user calling start for the first time', () => {
    const EMAIL = 'startonb.first@example.com';
    const USERNAME = 'startonbfirst';
    let accessToken: string;

    beforeAll(async () => {
      await truncateOnboardingWorkerTables(dataSource);
      await signUp(app, dataSource, EMAIL, USERNAME);
      accessToken = await signIn(app, EMAIL);
    });

    describe('When POST /api/onboarding/start is called', () => {
      it('Then it returns 201 with IN_PROGRESS status and currentStep 0', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/onboarding/start')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(HttpStatus.CREATED);
        expect(res.body).toMatchObject({
          status: 'IN_PROGRESS',
          currentStep: 0,
        });
      });
    });

    describe('When POST /api/onboarding/start is called again (idempotent)', () => {
      it('Then it returns 201 with same IN_PROGRESS status (not 409)', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/onboarding/start')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(HttpStatus.CREATED);
        expect(res.body).toMatchObject({
          status: 'IN_PROGRESS',
        });
      });
    });
  });

  describe('Given a user who has already completed onboarding (CREATE path)', () => {
    const EMAIL = 'startonb.completed@example.com';
    const USERNAME = 'startonbcompleted';
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
            name: 'Already Done Biz',
            businessType: 'retail',
            country: 'MX',
            timezone: 'America/Mexico_City',
          },
        });

      await request(app.getHttpServer())
        .post('/api/onboarding/complete')
        .set('Authorization', `Bearer ${accessToken}`);
    });

    describe('When POST /api/onboarding/start is called after completion', () => {
      it('Then it returns 409 Conflict (OnboardingAlreadyCompleted)', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/onboarding/start')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(HttpStatus.CONFLICT);
      });
    });
  });
});

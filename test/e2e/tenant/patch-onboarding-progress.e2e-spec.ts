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

describe('PATCH /api/onboarding/progress (e2e)', () => {
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

  describe('Given an authenticated user going through the CREATE path', () => {
    const EMAIL = 'patchprog.create@example.com';
    const USERNAME = 'patchprogcreate';
    let accessToken: string;

    beforeAll(async () => {
      await truncateOnboardingWorkerTables(dataSource);
      await signUp(app, dataSource, EMAIL, USERNAME);
      accessToken = await signIn(app, EMAIL);

      await request(app.getHttpServer())
        .post('/api/onboarding/start')
        .set('Authorization', `Bearer ${accessToken}`);
    });

    describe('When PATCH /api/onboarding/progress is called with preferences', () => {
      it('Then it returns 200 with IN_PROGRESS status', async () => {
        const res = await request(app.getHttpServer())
          .patch('/api/onboarding/progress')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ section: 'preferences', data: { locale: 'es', currency: 'MXN' } });

        expect(res.status).toBe(HttpStatus.OK);
        expect(res.body).toMatchObject({
          status: 'IN_PROGRESS',
        });
      });
    });

    describe('When PATCH /api/onboarding/progress is called with path CREATE', () => {
      it('Then it returns 200 with path CREATE', async () => {
        const res = await request(app.getHttpServer())
          .patch('/api/onboarding/progress')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ section: 'path', data: { path: 'CREATE' } });

        expect(res.status).toBe(HttpStatus.OK);
        expect(res.body).toMatchObject({
          path: 'CREATE',
        });
      });
    });

    describe('When PATCH /api/onboarding/progress is called with businessProfile', () => {
      it('Then it returns 200', async () => {
        const res = await request(app.getHttpServer())
          .patch('/api/onboarding/progress')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            section: 'businessProfile',
            data: {
              name: 'Test Negocio',
              businessType: 'retail',
              country: 'MX',
              timezone: 'America/Mexico_City',
            },
          });

        expect(res.status).toBe(HttpStatus.OK);
      });
    });
  });

  describe('Given a user who never started onboarding', () => {
    const EMAIL = 'patchprog.nosession@example.com';
    const USERNAME = 'patchprognosession';
    let accessToken: string;

    beforeAll(async () => {
      await truncateOnboardingWorkerTables(dataSource);
      await signUp(app, dataSource, EMAIL, USERNAME);
      accessToken = await signIn(app, EMAIL);
    });

    describe('When PATCH /api/onboarding/progress is called without starting first', () => {
      it('Then it returns 404 Not Found (OnboardingNotFound)', async () => {
        const res = await request(app.getHttpServer())
          .patch('/api/onboarding/progress')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ section: 'preferences', data: { locale: 'es', currency: 'MXN' } });

        expect(res.status).toBe(HttpStatus.NOT_FOUND);
      });
    });
  });

  describe('Given a user with an Accept-Language header', () => {
    const EMAIL = 'patchprog.locale@example.com';
    const USERNAME = 'patchproglocale';
    let accessToken: string;

    beforeAll(async () => {
      await truncateOnboardingWorkerTables(dataSource);
      await signUp(app, dataSource, EMAIL, USERNAME);
      accessToken = await signIn(app, EMAIL);
      await request(app.getHttpServer())
        .post('/api/onboarding/start')
        .set('Authorization', `Bearer ${accessToken}`);
    });

    describe('When PATCH /api/onboarding/progress is called with Accept-Language: en-US', () => {
      it('Then it returns 200 (locale normalized to en)', async () => {
        const res = await request(app.getHttpServer())
          .patch('/api/onboarding/progress')
          .set('Authorization', `Bearer ${accessToken}`)
          .set('Accept-Language', 'en-US,en;q=0.9')
          .send({ section: 'preferences', data: { locale: 'en', currency: 'USD' } });

        expect(res.status).toBe(HttpStatus.OK);
      });
    });

    describe('When PATCH /api/onboarding/progress is called with Accept-Language: es-MX', () => {
      it('Then it returns 200 (locale normalized to es)', async () => {
        const res = await request(app.getHttpServer())
          .patch('/api/onboarding/progress')
          .set('Authorization', `Bearer ${accessToken}`)
          .set('Accept-Language', 'es-MX,es;q=0.9')
          .send({ section: 'preferences', data: { locale: 'es', currency: 'MXN' } });

        expect(res.status).toBe(HttpStatus.OK);
      });
    });
  });

  describe('Given a user who has already completed onboarding', () => {
    const EMAIL = 'patchprog.completed@example.com';
    const USERNAME = 'patchprogcompleted';
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
            name: 'Completed Save Biz',
            businessType: 'retail',
            country: 'MX',
            timezone: 'America/Mexico_City',
          },
        });

      await request(app.getHttpServer())
        .post('/api/onboarding/complete')
        .set('Authorization', `Bearer ${accessToken}`);
    });

    describe('When PATCH /api/onboarding/progress is called after completion', () => {
      it('Then it returns 409 Conflict (OnboardingAlreadyCompleted)', async () => {
        const res = await request(app.getHttpServer())
          .patch('/api/onboarding/progress')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ section: 'preferences', data: { locale: 'en', currency: 'USD' } });

        expect(res.status).toBe(HttpStatus.CONFLICT);
      });
    });
  });
});

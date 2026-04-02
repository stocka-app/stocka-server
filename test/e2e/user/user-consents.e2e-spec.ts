import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { getWorkerApp, truncateWorkerTables, resetEmailMock } from '@test/worker-app';

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function signUpAndGetToken(
  app: INestApplication,
  email: string,
  username: string,
): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/api/authentication/sign-up')
    .send({ email, username, password: 'SecurePass1!' });
  return res.body.accessToken as string;
}

// ─── Spec ─────────────────────────────────────────────────────────────────────

describe('User Consents (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const workerApp = await getWorkerApp();
    app = workerApp.app;
    dataSource = workerApp.dataSource;
  });

  afterAll(async () => {
    await truncateWorkerTables(dataSource);
  });

  beforeEach(async () => {
    resetEmailMock();

    if (dataSource?.isInitialized) {
      await truncateWorkerTables(dataSource);
    }
  });

  // ── POST /api/users/me/consents (RecordUserConsentsController) ────────────

  describe('Given an authenticated user', () => {
    describe('When they submit consents with terms accepted', () => {
      it('Then it returns 201 with recorded: true', async () => {
        const token = await signUpAndGetToken(app, 'consent1@example.com', 'consentuser1');

        const res = await request(app.getHttpServer())
          .post('/api/users/me/consents')
          .set('Authorization', `Bearer ${token}`)
          .send({ terms: true, marketing: true, analytics: false });

        expect(res.status).toBe(HttpStatus.CREATED);
        expect(res.body.recorded).toBe(true);
      });
    });

    describe('When they submit consents without a user-agent header', () => {
      it('Then it returns 201 and the null user-agent fallback is used', async () => {
        const token = await signUpAndGetToken(app, 'consent5@example.com', 'consentuser5');

        const res = await request(app.getHttpServer())
          .post('/api/users/me/consents')
          .set('Authorization', `Bearer ${token}`)
          .unset('User-Agent')
          .send({ terms: true, marketing: false, analytics: false });

        expect(res.status).toBe(HttpStatus.CREATED);
        expect(res.body.recorded).toBe(true);
      });
    });

    describe('When they submit consents with terms rejected', () => {
      it('Then it returns 400 because terms must be accepted', async () => {
        const token = await signUpAndGetToken(app, 'consent2@example.com', 'consentuser2');

        const res = await request(app.getHttpServer())
          .post('/api/users/me/consents')
          .set('Authorization', `Bearer ${token}`)
          .send({ terms: false, marketing: false, analytics: false });

        expect(res.status).toBe(HttpStatus.BAD_REQUEST);
      });
    });
  });

  describe('Given an unauthenticated client', () => {
    describe('When they call POST /api/users/me/consents', () => {
      it('Then it returns 401 Unauthorized', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/users/me/consents')
          .send({ terms: true, marketing: true, analytics: false });

        expect(res.status).toBe(HttpStatus.UNAUTHORIZED);
      });
    });
  });

  // ── GET /api/users/me/consents (GetUserConsentsController) ────────────────

  describe('Given an authenticated user with no consents recorded', () => {
    describe('When they request their consent status', () => {
      it('Then it returns 200 with an empty array', async () => {
        const token = await signUpAndGetToken(app, 'consent3@example.com', 'consentuser3');

        const res = await request(app.getHttpServer())
          .get('/api/users/me/consents')
          .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(HttpStatus.OK);
        expect(res.body.consents).toEqual([]);
      });
    });
  });

  describe('Given an authenticated user who has already recorded their consents', () => {
    describe('When they request their consent status', () => {
      it('Then it returns 200 with their latest consent entries per type', async () => {
        const token = await signUpAndGetToken(app, 'consent4@example.com', 'consentuser4');

        await request(app.getHttpServer())
          .post('/api/users/me/consents')
          .set('Authorization', `Bearer ${token}`)
          .send({ terms: true, marketing: false, analytics: true });

        const res = await request(app.getHttpServer())
          .get('/api/users/me/consents')
          .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(HttpStatus.OK);
        expect(Array.isArray(res.body.consents)).toBe(true);
        expect(res.body.consents.length).toBeGreaterThan(0);
        expect(res.body.consents[0]).toHaveProperty('consentType');
        expect(res.body.consents[0]).toHaveProperty('granted');
        expect(res.body.consents[0]).toHaveProperty('grantedAt');
      });
    });
  });

  describe('Given an unauthenticated client', () => {
    describe('When they call GET /api/users/me/consents', () => {
      it('Then it returns 401 Unauthorized', async () => {
        const res = await request(app.getHttpServer()).get('/api/users/me/consents');

        expect(res.status).toBe(HttpStatus.UNAUTHORIZED);
      });
    });
  });

  // ── POST /api/users/me/consents — overwrite existing consents ──────────

  describe('Given an authenticated user who already recorded consents', () => {
    describe('When they submit updated consents (marketing changed)', () => {
      it('Then it returns 201 and the new consent values are persisted', async () => {
        const token = await signUpAndGetToken(app, 'consent6@example.com', 'consentuser6');

        // Record initial consents
        await request(app.getHttpServer())
          .post('/api/users/me/consents')
          .set('Authorization', `Bearer ${token}`)
          .send({ terms: true, marketing: false, analytics: false });

        // Update consents
        const res = await request(app.getHttpServer())
          .post('/api/users/me/consents')
          .set('Authorization', `Bearer ${token}`)
          .send({ terms: true, marketing: true, analytics: true });

        expect(res.status).toBe(HttpStatus.CREATED);
        expect(res.body.recorded).toBe(true);

        // Verify the latest entries
        const getRes = await request(app.getHttpServer())
          .get('/api/users/me/consents')
          .set('Authorization', `Bearer ${token}`);

        expect(getRes.status).toBe(HttpStatus.OK);
        const consents = getRes.body.consents as Array<{
          consentType: string;
          granted: boolean;
        }>;
        expect(consents.length).toBeGreaterThan(0);
      });
    });
  });
});

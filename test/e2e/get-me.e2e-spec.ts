import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { getWorkerApp, truncateWorkerTables, resetEmailMock } from '@test/worker-app';

describe('Get Me (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  // Helper: sign up a user and return their access token
  async function signUpAndGetToken(email: string, username: string): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/api/authentication/sign-up')
      .send({ email, username, password: 'SecurePass1!' });
    return res.body.accessToken as string;
  }

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

  // ---------------------------------------------------------------------------
  // Happy path
  // ---------------------------------------------------------------------------

  describe('Given an authenticated user with a valid access token', () => {
    describe('When they call GET /api/users/me', () => {
      it('Then they receive a 200 with their profile: id, email, username, and createdAt', async () => {
        const token = await signUpAndGetToken('me1@example.com', 'meuser1');

        const res = await request(app.getHttpServer())
          .get('/api/users/me')
          .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(HttpStatus.OK);
        expect(res.body.id).toBeDefined();
        expect(res.body.email).toBe('me1@example.com');
        expect(res.body.username).toBe('meuser1');
        expect(res.body.createdAt).toBeDefined();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Error cases
  // ---------------------------------------------------------------------------

  describe('Given a client that sends a request without any authorization token', () => {
    describe('When they call GET /api/users/me', () => {
      it('Then they receive a 401 Unauthorized', async () => {
        const res = await request(app.getHttpServer()).get('/api/users/me');

        expect(res.status).toBe(HttpStatus.UNAUTHORIZED);
      });
    });
  });

  describe('Given a client that presents a malformed or tampered JWT', () => {
    describe('When they call GET /api/users/me', () => {
      it('Then they receive a 401 Unauthorized', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/users/me')
          .set('Authorization', 'Bearer this.is.not.a.valid.jwt');

        expect(res.status).toBe(HttpStatus.UNAUTHORIZED);
      });
    });
  });
});

import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import {
  CreateNewSessionStep,
  GenerateRefreshTokensStep,
  ArchiveOldSessionStep,
} from '@authentication/application/sagas/refresh-session/steps';
import { getWorkerApp, truncateWorkerTables } from '@test/worker-app';

describe('Refresh Session (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let createNewSessionStep: CreateNewSessionStep;
  let generateRefreshTokensStep: GenerateRefreshTokensStep;
  let archiveOldSessionStep: ArchiveOldSessionStep;

  // Helper: sign up a user and return the refresh token cookie
  async function signUpAndGetCookie(
    email: string,
    username: string,
  ): Promise<{ cookie: string; refreshToken: string }> {
    const signUpRes = await request(app.getHttpServer())
      .post('/api/authentication/sign-up')
      .send({ email, username, password: 'SecurePass1!' });

    const setCookieHeader = signUpRes.headers['set-cookie'] as string | string[];
    const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader ?? ''];
    const refreshCookie = cookies.find((c) => c.startsWith('refresh_token=')) ?? '';
    const refreshToken = refreshCookie.split('=')[1]?.split(';')[0] ?? '';

    return { cookie: refreshCookie, refreshToken };
  }

  beforeAll(async () => {
    const workerApp = await getWorkerApp();
    app = workerApp.app;
    dataSource = workerApp.dataSource;
    await truncateWorkerTables(dataSource);
    createNewSessionStep = app.get(CreateNewSessionStep);
    generateRefreshTokensStep = app.get(GenerateRefreshTokensStep);
    archiveOldSessionStep = app.get(ArchiveOldSessionStep);
  });

  afterAll(async () => {
    await truncateWorkerTables(dataSource);
  });

  // ---------------------------------------------------------------------------
  // Happy path
  // ---------------------------------------------------------------------------

  describe('Given a customer with a valid refresh token cookie', () => {
    describe('When they call the refresh-session endpoint', () => {
      it('Then they receive a new access token in the response body', async () => {
        const { cookie } = await signUpAndGetCookie('refresh1@example.com', 'refreshuser1');

        const res = await request(app.getHttpServer())
          .post('/api/authentication/refresh-session')
          .set('Cookie', cookie);

        expect(res.status).toBe(HttpStatus.CREATED);
        expect(res.body.accessToken).toBeDefined();
        expect(typeof res.body.accessToken).toBe('string');
      });

      it('Then a new refresh token cookie is set in the response', async () => {
        const { cookie } = await signUpAndGetCookie('refresh2@example.com', 'refreshuser2');

        const res = await request(app.getHttpServer())
          .post('/api/authentication/refresh-session')
          .set('Cookie', cookie);

        const setCookieHeader = res.headers['set-cookie'] as string | string[];
        const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader ?? ''];
        const newRefreshCookie = cookies.find((c) => c.startsWith('refresh_token='));

        expect(newRefreshCookie).toBeDefined();
      });

      it('Then the old session is archived in the database', async () => {
        const { cookie } = await signUpAndGetCookie('refresh3@example.com', 'refreshuser3');

        // Get the original session before refresh
        const [account] = await dataSource.query(
          `SELECT a.id FROM "accounts"."accounts" a JOIN "accounts"."credential_accounts" ca ON ca.account_id = a.id WHERE LOWER(ca.email) = 'refresh3@example.com'`,
        );
        const [originalSession] = await dataSource.query(
          `SELECT uuid FROM "sessions"."sessions" WHERE account_id = $1 AND archived_at IS NULL`,
          [account.id],
        );

        await request(app.getHttpServer())
          .post('/api/authentication/refresh-session')
          .set('Cookie', cookie);

        const [archivedCheck] = await dataSource.query(
          `SELECT archived_at FROM "sessions"."sessions" WHERE uuid = $1`,
          [originalSession.uuid],
        );

        expect(archivedCheck.archived_at).not.toBeNull();
      });

      it('Then a new active session is created in the database', async () => {
        const { cookie } = await signUpAndGetCookie('refresh4@example.com', 'refreshuser4');

        const [account] = await dataSource.query(
          `SELECT a.id FROM "accounts"."accounts" a JOIN "accounts"."credential_accounts" ca ON ca.account_id = a.id WHERE LOWER(ca.email) = 'refresh4@example.com'`,
        );

        const sessionsBefore = await dataSource.query(
          `SELECT COUNT(*) as count FROM "sessions"."sessions" WHERE account_id = $1`,
          [account.id],
        );

        await request(app.getHttpServer())
          .post('/api/authentication/refresh-session')
          .set('Cookie', cookie);

        const sessionsAfter = await dataSource.query(
          `SELECT COUNT(*) as count FROM "sessions"."sessions" WHERE account_id = $1`,
          [account.id],
        );

        expect(parseInt(sessionsAfter[0].count)).toBe(parseInt(sessionsBefore[0].count) + 1);
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Error cases
  // ---------------------------------------------------------------------------

  describe('Given a customer with no refresh token cookie', () => {
    describe('When they call the refresh-session endpoint without a cookie', () => {
      it('Then they receive a 401 Unauthorized', async () => {
        const res = await request(app.getHttpServer()).post('/api/authentication/refresh-session');

        expect(res.status).toBe(HttpStatus.UNAUTHORIZED);
      });
    });
  });

  describe('Given a customer who presents an invalid or tampered refresh token', () => {
    describe('When they call the refresh-session endpoint', () => {
      it('Then they receive a 401 Unauthorized', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/authentication/refresh-session')
          .set('Cookie', 'refresh_token=tampered.token.value');

        expect(res.status).toBe(HttpStatus.UNAUTHORIZED);
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Rollback — new session creation fails → old session NOT archived
  // ---------------------------------------------------------------------------

  describe('Given the new session creation fails after the old session is archived', () => {
    describe('When the database rejects the new session insert mid-transaction', () => {
      it('Then the transaction is rolled back and the original session remains active', async () => {
        const { cookie } = await signUpAndGetCookie('rollback.refresh@example.com', 'rollbackref');

        const [account] = await dataSource.query(
          `SELECT a.id FROM "accounts"."accounts" a JOIN "accounts"."credential_accounts" ca ON ca.account_id = a.id WHERE LOWER(ca.email) = 'rollback.refresh@example.com'`,
        );
        const [originalSession] = await dataSource.query(
          `SELECT uuid FROM "sessions"."sessions" WHERE account_id = $1 AND archived_at IS NULL`,
          [account.id],
        );

        const spy = jest
          .spyOn(createNewSessionStep, 'execute')
          .mockRejectedValueOnce(new Error('Session insert failed mid-transaction'));

        const res = await request(app.getHttpServer())
          .post('/api/authentication/refresh-session')
          .set('Cookie', cookie);

        expect(res.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);

        // Original session must still be active (archive rolled back)
        const [sessionCheck] = await dataSource.query(
          `SELECT archived_at FROM "sessions"."sessions" WHERE uuid = $1`,
          [originalSession.uuid],
        );

        expect(sessionCheck.archived_at).toBeNull();
        spy.mockRestore();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Rollback — token generation fails → old session NOT archived
  // ---------------------------------------------------------------------------

  describe('Given the token generation step fails after the old session is archived', () => {
    describe('When GenerateRefreshTokensStep throws mid-transaction', () => {
      it('Then the transaction is rolled back and the original session remains active', async () => {
        const { cookie } = await signUpAndGetCookie(
          'rollback.gentokens@example.com',
          'rollbackgenref',
        );

        const [account] = await dataSource.query(
          `SELECT a.id FROM "accounts"."accounts" a JOIN "accounts"."credential_accounts" ca ON ca.account_id = a.id WHERE LOWER(ca.email) = 'rollback.gentokens@example.com'`,
        );
        const [originalSession] = await dataSource.query(
          `SELECT uuid FROM "sessions"."sessions" WHERE account_id = $1 AND archived_at IS NULL`,
          [account.id],
        );

        const spy = jest
          .spyOn(generateRefreshTokensStep, 'execute')
          .mockRejectedValueOnce(new Error('JWT signing failure during refresh'));

        const res = await request(app.getHttpServer())
          .post('/api/authentication/refresh-session')
          .set('Cookie', cookie);

        expect(res.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);

        // Original session must still be active (archive rolled back)
        const [sessionCheck] = await dataSource.query(
          `SELECT archived_at FROM "sessions"."sessions" WHERE uuid = $1`,
          [originalSession.uuid],
        );

        expect(sessionCheck.archived_at).toBeNull();
        spy.mockRestore();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Rollback — archive step fails → saga error catch
  // ---------------------------------------------------------------------------

  describe('Given the archive-old-session step fails', () => {
    describe('When ArchiveOldSessionStep throws', () => {
      it('Then the saga catches the error and the response is 500', async () => {
        const { cookie } = await signUpAndGetCookie(
          'rollback.archive@example.com',
          'rollbackarchref',
        );

        const spy = jest
          .spyOn(archiveOldSessionStep, 'execute')
          .mockRejectedValueOnce(new Error('Archive session DB error'));

        const res = await request(app.getHttpServer())
          .post('/api/authentication/refresh-session')
          .set('Cookie', cookie);

        expect(res.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);

        spy.mockRestore();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Branch coverage — reusing a consumed refresh token
  // ---------------------------------------------------------------------------

  describe('Given a customer who already used their refresh token', () => {
    describe('When they try to use the same refresh token a second time', () => {
      it('Then they receive a 401 Unauthorized because the old session is archived', async () => {
        const { cookie } = await signUpAndGetCookie(
          'reuse.refresh@example.com',
          'reuserefuser',
        );

        // First refresh succeeds and archives the old session
        const first = await request(app.getHttpServer())
          .post('/api/authentication/refresh-session')
          .set('Cookie', cookie);
        expect(first.status).toBe(HttpStatus.CREATED);

        // Second refresh with the same (now-archived) token should fail
        const second = await request(app.getHttpServer())
          .post('/api/authentication/refresh-session')
          .set('Cookie', cookie);

        expect(second.status).toBe(HttpStatus.UNAUTHORIZED);
      });
    });
  });
});

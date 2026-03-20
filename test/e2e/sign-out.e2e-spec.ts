import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { IEmailProviderContract } from '@shared/infrastructure/email/contracts/email-provider.contract';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { getWorkerApp, truncateWorkerTables } from '@test/worker-app';

describe('Sign Out (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let emailProvider: jest.Mocked<IEmailProviderContract>;

  // Helper: sign up a fresh user and return the refresh_token cookie string
  async function signUpAndGetCookie(email: string, username: string): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/api/authentication/sign-up')
      .send({ email, username, password: 'SecurePass1' });
    const setCookieHeader = res.headers['set-cookie'] as string | string[];
    const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader ?? ''];
    return cookies.find((c) => c.startsWith('refresh_token=')) ?? '';
  }

  beforeAll(async () => {
    const workerApp = await getWorkerApp();
    app = workerApp.app;
    dataSource = workerApp.dataSource;
    emailProvider = app.get<jest.Mocked<IEmailProviderContract>>(
      INJECTION_TOKENS.EMAIL_PROVIDER_CONTRACT,
    );
  });

  afterAll(async () => {
    await truncateWorkerTables(dataSource);
  });

  beforeEach(async () => {
    jest.resetAllMocks();
    emailProvider.sendEmail.mockResolvedValue({ id: 'mock-id', success: true });
    emailProvider.sendVerificationEmail.mockResolvedValue({ id: 'mock-id', success: true });
    emailProvider.sendWelcomeEmail.mockResolvedValue({ id: 'mock-id', success: true });
    emailProvider.sendPasswordResetEmail.mockResolvedValue({ id: 'mock-id', success: true });

    if (dataSource?.isInitialized) {
      await dataSource.query('DELETE FROM "authn"."email_verification_tokens"');
      await dataSource.query('DELETE FROM "sessions"."sessions"');
      await dataSource.query('DELETE FROM "identity"."users"');
    }
  });

  // ---------------------------------------------------------------------------
  // Happy path — valid refresh token cookie
  // ---------------------------------------------------------------------------

  describe('Given a user who has a valid refresh token cookie', () => {
    describe('When they call the sign-out endpoint', () => {
      it('Then they receive a 200 with the signed-out confirmation message', async () => {
        const cookie = await signUpAndGetCookie('signout1@example.com', 'signoutuser1');

        const res = await request(app.getHttpServer())
          .post('/api/authentication/sign-out')
          .set('Cookie', cookie);

        expect(res.status).toBe(HttpStatus.OK);
        expect(res.body.message).toBe('Successfully signed out');
      });

      it('Then the refresh_token cookie is cleared in the response', async () => {
        const cookie = await signUpAndGetCookie('signout2@example.com', 'signoutuser2');

        const res = await request(app.getHttpServer())
          .post('/api/authentication/sign-out')
          .set('Cookie', cookie);

        const setCookieHeader = res.headers['set-cookie'] as string | string[] | undefined;
        expect(setCookieHeader).toBeDefined();

        const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader ?? ''];
        const clearedCookie = cookies.find((c) => c.startsWith('refresh_token='));

        expect(clearedCookie).toBeDefined();
        // The cookie must be cleared — value is empty or the cookie is expired
        expect(clearedCookie).toMatch(/refresh_token=;|refresh_token=\s*;/);
      });

      it('Then the user session is archived in the database', async () => {
        const cookie = await signUpAndGetCookie('signout3@example.com', 'signoutuser3');

        const [account] = await dataSource.query(
          `SELECT a.id FROM "accounts"."accounts" a JOIN "accounts"."credential_accounts" ca ON ca.account_id = a.id WHERE LOWER(ca.email) = 'signout3@example.com'`,
        );

        // Verify the session exists and is active before sign-out
        const [activeSession] = await dataSource.query(
          `SELECT uuid FROM "sessions"."sessions" WHERE account_id = $1 AND archived_at IS NULL`,
          [account.id],
        );
        expect(activeSession).toBeDefined();

        await request(app.getHttpServer())
          .post('/api/authentication/sign-out')
          .set('Cookie', cookie);

        const activeSessions = await dataSource.query(
          `SELECT uuid FROM "sessions"."sessions" WHERE account_id = $1 AND archived_at IS NULL`,
          [account.id],
        );
        expect(activeSessions.length).toBe(0);
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Graceful sign-out without cookie
  // ---------------------------------------------------------------------------

  describe('Given a client that sends a sign-out request without any cookie', () => {
    describe('When they call the sign-out endpoint', () => {
      it('Then they receive a 200 — sign-out is idempotent and requires no authentication', async () => {
        const res = await request(app.getHttpServer()).post('/api/authentication/sign-out');

        expect(res.status).toBe(HttpStatus.OK);
        expect(res.body.message).toBe('Successfully signed out');
      });
    });
  });
});

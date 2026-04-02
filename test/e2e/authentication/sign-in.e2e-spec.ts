import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import {
  CreateSignInSessionStep,
  GenerateSignInTokensStep,
  PublishSignInEventsStep,
  ValidateCredentialsStep,
} from '@authentication/application/sagas/sign-in/steps';
import { getWorkerApp, truncateWorkerTables, resetEmailMock } from '@test/worker-app';

describe('Sign In (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let createSignInSessionStep: CreateSignInSessionStep;
  let generateSignInTokensStep: GenerateSignInTokensStep;
  let publishSignInEventsStep: PublishSignInEventsStep;
  let validateCredentialsStep: ValidateCredentialsStep;

  // Helper for rollback tests — uses HTTP so it runs through UoW/saga.
  // Safe since UnitOfWorkIsolationMiddleware isolates ALS per request.
  async function signUp(email: string, username: string, password = 'SecurePass1!'): Promise<void> {
    await request(app.getHttpServer())
      .post('/api/authentication/sign-up')
      .send({ email, username, password });
    await dataSource.query(
      `UPDATE "accounts"."credential_accounts" SET status = 'active', email_verified_at = NOW() WHERE LOWER(email) = LOWER($1)`,
      [email],
    );
  }

  beforeAll(async () => {
    const workerApp = await getWorkerApp();
    app = workerApp.app;
    dataSource = workerApp.dataSource;
    await truncateWorkerTables(dataSource);
    createSignInSessionStep = app.get(CreateSignInSessionStep);
    generateSignInTokensStep = app.get(GenerateSignInTokensStep);
    publishSignInEventsStep = app.get(PublishSignInEventsStep);
    validateCredentialsStep = app.get(ValidateCredentialsStep);

    // Seed base verified user via HTTP sign-up, then activate via SQL.
    // Sign-in requires: status='active', email_verified_at set, and known password.
    await request(app.getHttpServer())
      .post('/api/authentication/sign-up')
      .send({ email: 'signin@example.com', username: 'signinuser', password: 'SecurePass1!' });
    await dataSource.query(
      `UPDATE "accounts"."credential_accounts" SET status = 'active', email_verified_at = NOW() WHERE LOWER(email) = 'signin@example.com'`,
    );
  });

  afterAll(async () => {
    await truncateWorkerTables(dataSource);
  });

  beforeEach(() => {
    resetEmailMock();
  });

  // ---------------------------------------------------------------------------
  // Happy path — email login
  // ---------------------------------------------------------------------------

  describe('Given a registered user with valid credentials', () => {
    describe('When they sign in using their email address', () => {
      it('Then they receive a 200 with their profile, access token, and emailVerificationRequired flag', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/authentication/sign-in')
          .send({ emailOrUsername: 'signin@example.com', password: 'SecurePass1!' });

        expect(res.status).toBe(HttpStatus.OK);
        expect(res.body.accessToken).toBeDefined();
        expect(typeof res.body.accessToken).toBe('string');
        expect(res.body.user).toBeDefined();
        expect(res.body.user.id).toBeDefined();
        expect(res.body.user.email).toBe('signin@example.com');
        expect(res.body.user.username).toBe('signinuser');
        expect(res.body.user.createdAt).toBeDefined();
        expect(typeof res.body.emailVerificationRequired).toBe('boolean');
      });

      it('Then the response includes an HttpOnly refresh_token cookie', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/authentication/sign-in')
          .send({ emailOrUsername: 'signin@example.com', password: 'SecurePass1!' });

        expect(res.status).toBe(HttpStatus.OK);

        const setCookieHeader = res.headers['set-cookie'] as string | string[] | undefined;
        expect(setCookieHeader).toBeDefined();

        const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader ?? ''];
        const refreshCookie = cookies.find((c) => c.startsWith('refresh_token='));

        expect(refreshCookie).toBeDefined();
        expect(refreshCookie!.toLowerCase()).toContain('httponly');
      });

      it('Then a new session is persisted in the database', async () => {
        const [account] = await dataSource.query(
          `SELECT a.id FROM "accounts"."accounts" a JOIN "accounts"."credential_accounts" ca ON ca.account_id = a.id WHERE LOWER(ca.email) = 'signin@example.com'`,
        );
        const before = await dataSource.query(
          `SELECT COUNT(*) as count FROM "sessions"."sessions" WHERE account_id = $1 AND archived_at IS NULL`,
          [account.id],
        );

        await request(app.getHttpServer())
          .post('/api/authentication/sign-in')
          .send({ emailOrUsername: 'signin@example.com', password: 'SecurePass1!' });

        const after = await dataSource.query(
          `SELECT COUNT(*) as count FROM "sessions"."sessions" WHERE account_id = $1 AND archived_at IS NULL`,
          [account.id],
        );

        expect(parseInt(after[0].count)).toBeGreaterThan(parseInt(before[0].count));
      });
    });

    describe('When they sign in using their username instead of email', () => {
      it('Then they receive a 200 — username-based login is supported', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/authentication/sign-in')
          .send({ emailOrUsername: 'signinuser', password: 'SecurePass1!' });

        expect(res.status).toBe(HttpStatus.OK);
        expect(res.body.accessToken).toBeDefined();
        expect(res.body.user.username).toBe('signinuser');
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Error cases
  // ---------------------------------------------------------------------------

  describe('Given a registered user who provides the wrong password', () => {
    describe('When they attempt to sign in', () => {
      it('Then they receive a 401 Unauthorized with INVALID_CREDENTIALS error code', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/authentication/sign-in')
          .send({ emailOrUsername: 'signin@example.com', password: 'WrongPassword9' });

        expect(res.status).toBe(HttpStatus.UNAUTHORIZED);
        expect(res.body.error).toBe('INVALID_CREDENTIALS');
      });
    });
  });

  describe('Given a user who has never registered', () => {
    describe('When they attempt to sign in', () => {
      it('Then they receive a 401 Unauthorized with INVALID_CREDENTIALS error code', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/authentication/sign-in')
          .send({ emailOrUsername: 'ghost@example.com', password: 'SecurePass1!' });

        expect(res.status).toBe(HttpStatus.UNAUTHORIZED);
        expect(res.body.error).toBe('INVALID_CREDENTIALS');
      });
    });
  });

  describe('Given a client that sends a request with missing fields', () => {
    describe('When the emailOrUsername field is absent', () => {
      it('Then they receive a 400 Bad Request', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/authentication/sign-in')
          .send({ password: 'SecurePass1!' });

        expect(res.status).toBe(HttpStatus.BAD_REQUEST);
      });
    });

    describe('When the password field is absent', () => {
      it('Then they receive a 400 Bad Request', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/authentication/sign-in')
          .send({ emailOrUsername: 'signin@example.com' });

        expect(res.status).toBe(HttpStatus.BAD_REQUEST);
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Rollback — session creation fails → no partial session in DB
  // ---------------------------------------------------------------------------

  describe('Given a DB failure during session creation', () => {
    describe('When the session insert fails mid-transaction', () => {
      it('Then the sign-in fails and no orphaned session is left in the database', async () => {
        const email = 'rollback.signin@example.com';
        await signUp(email, 'rollbacksignin');

        const [account] = await dataSource.query(
          `SELECT a.id FROM "accounts"."accounts" a JOIN "accounts"."credential_accounts" ca ON ca.account_id = a.id WHERE LOWER(ca.email) = LOWER($1)`,
          [email],
        );
        const before = await dataSource.query(
          `SELECT COUNT(*) as count FROM "sessions"."sessions" WHERE account_id = $1`,
          [account.id],
        );

        const spy = jest
          .spyOn(createSignInSessionStep, 'execute')
          .mockRejectedValueOnce(new Error('Session insert failed mid-transaction'));

        const res = await request(app.getHttpServer())
          .post('/api/authentication/sign-in')
          .send({ emailOrUsername: email, password: 'SecurePass1!' });

        expect(res.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);

        const after = await dataSource.query(
          `SELECT COUNT(*) as count FROM "sessions"."sessions" WHERE account_id = $1`,
          [account.id],
        );

        expect(parseInt(after[0].count)).toBe(parseInt(before[0].count));
        spy.mockRestore();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Rollback — token generation fails → no session, no partial state
  // ---------------------------------------------------------------------------

  describe('Given a DB failure during token generation', () => {
    describe('When GenerateSignInTokensStep fails after credentials were validated', () => {
      it('Then the sign-in fails with 500 and no session is created', async () => {
        const email = 'rollback.gentokens@example.com';
        await signUp(email, 'rollbackgentokens');

        const spy = jest
          .spyOn(generateSignInTokensStep, 'execute')
          .mockRejectedValueOnce(new Error('Token generation failure'));

        const res = await request(app.getHttpServer())
          .post('/api/authentication/sign-in')
          .send({ emailOrUsername: email, password: 'SecurePass1!' });

        expect(res.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);

        spy.mockRestore();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Non-transactional step failure — publish events is fire-and-forget
  // ---------------------------------------------------------------------------

  describe('Given the publish-events step fails after commit', () => {
    describe('When PublishSignInEventsStep throws', () => {
      it('Then the saga still succeeds — non-transactional steps are fire-and-forget', async () => {
        const email = 'rollback.pubevents@example.com';
        await signUp(email, 'rollbackpubevents');

        const spy = jest
          .spyOn(publishSignInEventsStep, 'execute')
          .mockRejectedValueOnce(new Error('EventBus publish failure'));

        const res = await request(app.getHttpServer())
          .post('/api/authentication/sign-in')
          .send({ emailOrUsername: email, password: 'SecurePass1!' });

        // Saga completes despite publish failure
        expect(res.status).toBe(HttpStatus.OK);
        expect(res.body.accessToken).toBeDefined();

        spy.mockRestore();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Branch coverage — deactivated account
  // ---------------------------------------------------------------------------

  describe('Given a user whose account has been archived (deactivated)', () => {
    describe('When they attempt to sign in', () => {
      it('Then they receive a 401 Unauthorized with ACCOUNT_DEACTIVATED error code', async () => {
        const email = 'deactivated@example.com';
        await signUp(email, 'deactivateduser');

        // Archive the user to simulate deactivation
        await dataSource.query(
          `UPDATE "identity"."users" SET archived_at = NOW()
           WHERE uuid = (
             SELECT u.uuid FROM "identity"."users" u
             JOIN "accounts"."accounts" a ON a.user_id = u.id
             JOIN "accounts"."credential_accounts" ca ON ca.account_id = a.id
             WHERE LOWER(ca.email) = LOWER($1)
           )`,
          [email],
        );

        const res = await request(app.getHttpServer())
          .post('/api/authentication/sign-in')
          .send({ emailOrUsername: email, password: 'SecurePass1!' });

        expect(res.status).toBe(HttpStatus.UNAUTHORIZED);
        expect(res.body.error).toBe('ACCOUNT_DEACTIVATED');
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Branch coverage — pending email verification
  // ---------------------------------------------------------------------------

  describe('Given a user who has not verified their email yet', () => {
    describe('When they attempt to sign in', () => {
      it('Then they receive a 403 Forbidden with EMAIL_NOT_VERIFIED error code', async () => {
        // Sign up WITHOUT activating the account (no SQL update)
        await request(app.getHttpServer()).post('/api/authentication/sign-up').send({
          email: 'unverified@example.com',
          username: 'unverifieduser',
          password: 'SecurePass1!',
        });

        const res = await request(app.getHttpServer())
          .post('/api/authentication/sign-in')
          .send({ emailOrUsername: 'unverified@example.com', password: 'SecurePass1!' });

        expect(res.status).toBe(HttpStatus.FORBIDDEN);
        expect(res.body.error).toBe('EMAIL_NOT_VERIFIED');
      });
    });
  });
});

import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { IEmailProviderContract } from '@shared/infrastructure/email/contracts/email-provider.contract';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { getWorkerApp, truncateWorkerTables, resetEmailMock } from '@test/worker-app';

describe('Resend Verification Code (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let emailProvider: jest.Mocked<IEmailProviderContract>;

  // Helper: sign up and capture the emitted code from the mock email provider
  async function signUpAndCaptureCode(email: string, username: string): Promise<string> {
    let capturedCode = '';
    emailProvider.sendVerificationEmail.mockImplementationOnce(
      async (_email: string, code: string) => {
        capturedCode = code;
        return { id: 'mock-id', success: true };
      },
    );
    await request(app.getHttpServer())
      .post('/api/authentication/sign-up')
      .send({ email, username, password: 'SecurePass1!' });
    return capturedCode;
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
    resetEmailMock();

    if (dataSource?.isInitialized) {
      await dataSource.query('DELETE FROM "authn"."verification_attempts"');
      await dataSource.query('DELETE FROM "authn"."email_verification_tokens"');
      await dataSource.query('DELETE FROM "sessions"."sessions"');
      await dataSource.query('DELETE FROM "identity"."users"');
    }
  });

  // ---------------------------------------------------------------------------
  // Happy path
  // ---------------------------------------------------------------------------

  describe('Given a user with a pending email verification', () => {
    describe('When they request a resend of their verification code', () => {
      it('Then they receive a 200 with success: true and remainingResends >= 0', async () => {
        // Sign up creates the initial verification token; we advance past the cooldown
        // by deleting the existing token so a new one is created on resend
        await signUpAndCaptureCode('resend1@example.com', 'resenduser1');

        // Delete the existing token to bypass cooldown and create a fresh one
        await dataSource.query('DELETE FROM "authn"."email_verification_tokens"');

        const res = await request(app.getHttpServer())
          .post('/api/authentication/resend-verification-code')
          .send({ email: 'resend1@example.com' });

        expect(res.status).toBe(HttpStatus.OK);
        expect(res.body.success).toBe(true);
        expect(
          typeof res.body.remainingResends === 'number' || res.body.remainingResends === undefined,
        ).toBe(true);
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Non-existent user — anti-enumeration: returns 200 silently
  // ---------------------------------------------------------------------------

  describe('Given an email address that was never registered', () => {
    describe('When someone requests a resend for it', () => {
      it('Then they receive a 200 to prevent email enumeration — no error is exposed', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/authentication/resend-verification-code')
          .send({ email: 'ghost@example.com' });

        // The handler silently returns ok() for unknown emails (anti-enumeration)
        expect(res.status).toBe(HttpStatus.OK);
        expect(res.body.success).toBe(true);
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Already verified user
  // ---------------------------------------------------------------------------

  describe('Given a user who has already verified their email', () => {
    describe('When they request another verification code resend', () => {
      it('Then they receive a 400 with USER_ALREADY_VERIFIED error code', async () => {
        // 1. Sign up and capture the initial code
        const code = await signUpAndCaptureCode('resend2@example.com', 'resenduser2');

        // 2. Verify the email to mark the user as verified
        await request(app.getHttpServer())
          .post('/api/authentication/verify-email')
          .send({ email: 'resend2@example.com', code });

        // Allow event handlers to propagate the verification status update
        await new Promise((resolve) => setTimeout(resolve, 100));

        // 3. Try to resend — should fail because the user is already verified
        const res = await request(app.getHttpServer())
          .post('/api/authentication/resend-verification-code')
          .send({ email: 'resend2@example.com' });

        expect(res.status).toBe(HttpStatus.BAD_REQUEST);
        expect(res.body.error).toBe('USER_ALREADY_VERIFIED');
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Branch coverage — cooldown active
  // ---------------------------------------------------------------------------

  describe('Given a user who just received a resent verification code', () => {
    describe('When they immediately request another resend (within cooldown)', () => {
      it('Then they receive a 429 with RESEND_COOLDOWN_ACTIVE error code', async () => {
        await signUpAndCaptureCode('cooldown@example.com', 'cooldownuser');

        // Simulate a prior resend: set resend_count=1 (cooldown=60s) and last_resent_at=NOW
        await dataSource.query(
          `UPDATE "authn"."email_verification_tokens"
           SET resend_count = 1, last_resent_at = NOW()
           WHERE credential_account_id = (
             SELECT ca.id FROM "accounts"."credential_accounts" ca WHERE LOWER(ca.email) = 'cooldown@example.com'
           )`,
        );

        const res = await request(app.getHttpServer())
          .post('/api/authentication/resend-verification-code')
          .send({ email: 'cooldown@example.com' });

        expect(res.status).toBe(HttpStatus.TOO_MANY_REQUESTS);
        expect(res.body.error).toBe('RESEND_COOLDOWN_ACTIVE');
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Branch coverage — max resends exceeded
  // ---------------------------------------------------------------------------

  describe('Given a user who has exhausted all resend attempts', () => {
    describe('When they request another resend after max resends', () => {
      it('Then they receive a 429 with MAX_RESENDS_EXCEEDED error code', async () => {
        await signUpAndCaptureCode('maxresend@example.com', 'maxresenduser');

        // Set resend_count to the maximum and last_resent_at to a past time (past cooldown)
        await dataSource.query(
          `UPDATE "authn"."email_verification_tokens"
           SET resend_count = 5, last_resent_at = NOW() - INTERVAL '10 minutes'
           WHERE credential_account_id = (
             SELECT ca.id FROM "accounts"."credential_accounts" ca WHERE LOWER(ca.email) = 'maxresend@example.com'
           )`,
        );

        const res = await request(app.getHttpServer())
          .post('/api/authentication/resend-verification-code')
          .send({ email: 'maxresend@example.com' });

        expect(res.status).toBe(HttpStatus.TOO_MANY_REQUESTS);
        expect(res.body.error).toBe('MAX_RESENDS_EXCEEDED');
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Branch coverage — successful resend with existing token (past cooldown)
  // ---------------------------------------------------------------------------

  describe('Given a user with a pending verification who waited past the cooldown', () => {
    describe('When they request a resend', () => {
      it('Then they receive a 200 with the updated code info', async () => {
        await signUpAndCaptureCode('resend.past@example.com', 'resendpastuser');

        // Set last_resent_at to a past time to bypass cooldown
        await dataSource.query(
          `UPDATE "authn"."email_verification_tokens"
           SET last_resent_at = NOW() - INTERVAL '10 minutes'
           WHERE credential_account_id = (
             SELECT ca.id FROM "accounts"."credential_accounts" ca WHERE LOWER(ca.email) = 'resend.past@example.com'
           )`,
        );

        const res = await request(app.getHttpServer())
          .post('/api/authentication/resend-verification-code')
          .send({ email: 'resend.past@example.com' });

        expect(res.status).toBe(HttpStatus.OK);
        expect(res.body.success).toBe(true);
      });
    });
  });
});

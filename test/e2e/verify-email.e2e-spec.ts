import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { IEmailProviderContract } from '@shared/infrastructure/email/contracts/email-provider.contract';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { getWorkerApp, truncateWorkerTables, resetEmailMock } from '@test/worker-app';

describe('Verify Email (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let emailProvider: jest.Mocked<IEmailProviderContract>;

  // Helper: sign up and intercept the verification code emitted by the email provider mock
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

  describe('Given a newly registered user who has received their verification code', () => {
    describe('When they submit the correct code', () => {
      it('Then they receive a 200 with success: true', async () => {
        const code = await signUpAndCaptureCode('verify1@example.com', 'verifyuser1');

        const res = await request(app.getHttpServer())
          .post('/api/authentication/verify-email')
          .send({ email: 'verify1@example.com', code });

        expect(res.status).toBe(HttpStatus.OK);
        expect(res.body.success).toBe(true);
      });

      it('Then the Accept-Language header is accepted without breaking the response', async () => {
        const code = await signUpAndCaptureCode('verify2@example.com', 'verifyuser2');

        const res = await request(app.getHttpServer())
          .post('/api/authentication/verify-email')
          .set('Accept-Language', 'es')
          .send({ email: 'verify2@example.com', code });

        expect(res.status).toBe(HttpStatus.OK);
        expect(res.body.success).toBe(true);
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Error cases
  // ---------------------------------------------------------------------------

  describe('Given a registered user who submits the wrong verification code', () => {
    describe('When they call the verify-email endpoint with an incorrect code', () => {
      it('Then they receive a 400 Bad Request', async () => {
        await signUpAndCaptureCode('verify3@example.com', 'verifyuser3');

        const res = await request(app.getHttpServer())
          .post('/api/authentication/verify-email')
          .send({ email: 'verify3@example.com', code: 'WRONG1' });

        expect(res.status).toBe(HttpStatus.BAD_REQUEST);
      });
    });
  });

  describe('Given an email address that was never registered', () => {
    describe('When someone submits a verification code for it', () => {
      it('Then they receive a 400 Bad Request — user not found maps to invalid code to prevent enumeration', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/authentication/verify-email')
          .send({ email: 'ghost@example.com', code: 'ABC123' });

        expect(res.status).toBe(HttpStatus.BAD_REQUEST);
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Branch coverage — already verified user
  // ---------------------------------------------------------------------------

  describe('Given a user who has already verified their email', () => {
    describe('When they attempt to verify again', () => {
      it('Then they receive a 400 with USER_ALREADY_VERIFIED error code', async () => {
        const code = await signUpAndCaptureCode('alreadyverified@example.com', 'alreadyverified');

        // Verify the first time
        await request(app.getHttpServer())
          .post('/api/authentication/verify-email')
          .send({ email: 'alreadyverified@example.com', code });

        // Wait for event propagation
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Second attempt should fail
        const res = await request(app.getHttpServer())
          .post('/api/authentication/verify-email')
          .send({ email: 'alreadyverified@example.com', code });

        expect(res.status).toBe(HttpStatus.BAD_REQUEST);
        expect(res.body.error).toBe('USER_ALREADY_VERIFIED');
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Branch coverage — expired verification token (token not found because expired)
  // ---------------------------------------------------------------------------

  describe('Given a user whose verification token has expired', () => {
    describe('When they submit the code after expiration', () => {
      it('Then they receive a 400 — the expired token is filtered out by the active query', async () => {
        const code = await signUpAndCaptureCode('expired@example.com', 'expireduser');

        // Manually expire the token — findActiveByCredentialAccountId will return null
        await dataSource.query(
          `UPDATE "authn"."email_verification_tokens" SET expires_at = NOW() - INTERVAL '1 hour'
           WHERE credential_account_id = (
             SELECT ca.id FROM "accounts"."credential_accounts" ca WHERE LOWER(ca.email) = 'expired@example.com'
           )`,
        );

        const res = await request(app.getHttpServer())
          .post('/api/authentication/verify-email')
          .send({ email: 'expired@example.com', code });

        expect(res.status).toBe(HttpStatus.BAD_REQUEST);
        expect(res.body.error).toBe('INVALID_VERIFICATION_CODE');
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Branch coverage — no active token (token deleted or used)
  // ---------------------------------------------------------------------------

  describe('Given a user whose verification token was deleted', () => {
    describe('When they submit a code with no active token in the database', () => {
      it('Then they receive a 400 with INVALID_VERIFICATION_CODE error code', async () => {
        await signUpAndCaptureCode('notoken@example.com', 'notokenuser');

        // Delete the token
        await dataSource.query(
          `DELETE FROM "authn"."email_verification_tokens"
           WHERE credential_account_id = (
             SELECT ca.id FROM "accounts"."credential_accounts" ca WHERE LOWER(ca.email) = 'notoken@example.com'
           )`,
        );

        const res = await request(app.getHttpServer())
          .post('/api/authentication/verify-email')
          .send({ email: 'notoken@example.com', code: 'ABC123' });

        expect(res.status).toBe(HttpStatus.BAD_REQUEST);
        expect(res.body.error).toBe('INVALID_VERIFICATION_CODE');
      });
    });
  });
});

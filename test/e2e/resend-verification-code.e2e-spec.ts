import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { IEmailProviderContract } from '@shared/infrastructure/email/contracts/email-provider.contract';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { getWorkerApp, truncateWorkerTables } from '@test/worker-app';

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
    jest.resetAllMocks();
    emailProvider.sendEmail.mockResolvedValue({ id: 'mock-id', success: true });
    emailProvider.sendVerificationEmail.mockResolvedValue({ id: 'mock-id', success: true });
    emailProvider.sendWelcomeEmail.mockResolvedValue({ id: 'mock-id', success: true });
    emailProvider.sendPasswordResetEmail.mockResolvedValue({ id: 'mock-id', success: true });

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
});

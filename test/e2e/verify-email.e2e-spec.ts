import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { IEmailProviderContract } from '@shared/infrastructure/email/contracts/email-provider.contract';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { getWorkerApp, truncateWorkerTables } from '@test/worker-app';

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
      .send({ email, username, password: 'SecurePass1' });
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
      await dataSource.query('DELETE FROM verification_attempts');
      await dataSource.query('DELETE FROM email_verification_tokens');
      await dataSource.query('DELETE FROM sessions');
      await dataSource.query('DELETE FROM users');
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
});

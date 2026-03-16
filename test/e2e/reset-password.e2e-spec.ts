import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AuthenticationModule } from '@authentication/infrastructure/authentication.module';
import { UserModule } from '@user/infrastructure/user.module';
import { MediatorModule } from '@shared/infrastructure/mediator/mediator.module';
import { EmailModule } from '@shared/infrastructure/email/email.module';
import { UnitOfWorkModule } from '@shared/infrastructure/database/unit-of-work.module';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { IEmailProviderContract } from '@shared/infrastructure/email/contracts/email-provider.contract';
import { DomainExceptionFilter } from '@common/filters/domain-exception.filter';
import { validate } from '@core/config/environment/env.validation';
import databaseConfig from '@core/config/database/database.config';
import { MarkTokenUsedStep } from '@authentication/application/sagas/reset-password/steps';

describe('Reset Password (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let emailProvider: jest.Mocked<IEmailProviderContract>;
  let markTokenUsedStep: MarkTokenUsedStep;

  /**
   * Signs up a user, then requests a forgot-password to create a reset token.
   * Intercepts the email provider call to extract the plain token from the reset link.
   */
  async function setupUserWithResetToken(
    email: string,
    username: string,
  ): Promise<{ plainToken: string }> {
    await request(app.getHttpServer())
      .post('/api/authentication/sign-up')
      .send({ email, username, password: 'SecurePass1' });

    let capturedResetLink = '';
    emailProvider.sendPasswordResetEmail.mockImplementationOnce(
      async (toEmail: string, resetLink: string) => {
        capturedResetLink = resetLink;
        return { id: 'mock-id', success: true };
      },
    );

    await request(app.getHttpServer())
      .post('/api/authentication/forgot-password')
      .send({ email });

    // Allow event handlers to flush (they are async fire-and-forget)
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Extract token from the reset link: /auth/reset-password?token=<plainToken>
    const url = new URL(capturedResetLink);
    const plainToken = url.searchParams.get('token') ?? '';

    return { plainToken };
  }

  beforeAll(async () => {
    emailProvider = {
      sendEmail: jest.fn().mockResolvedValue({ id: 'mock-id', success: true }),
      sendVerificationEmail: jest.fn().mockResolvedValue({ id: 'mock-id', success: true }),
      sendWelcomeEmail: jest.fn().mockResolvedValue({ id: 'mock-id', success: true }),
      sendPasswordResetEmail: jest.fn().mockResolvedValue({ id: 'mock-id', success: true }),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [databaseConfig],
          validate,
          envFilePath: '.env.test',
        }),
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5434', 10),
          username: process.env.DB_USERNAME || 'stocka',
          password: process.env.DB_PASSWORD || 'stocka_dev',
          database: process.env.DB_DATABASE || 'stocka_test',
          autoLoadEntities: true,
          synchronize: false,
        }),
        EmailModule,
        UnitOfWorkModule,
        UserModule,
        AuthenticationModule,
        MediatorModule,
      ],
    })
      .overrideProvider(INJECTION_TOKENS.EMAIL_PROVIDER_CONTRACT)
      .useValue(emailProvider)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.setGlobalPrefix('api');
    app.useGlobalFilters(new DomainExceptionFilter());

    await app.init();
    dataSource = moduleFixture.get(DataSource);
    markTokenUsedStep = moduleFixture.get(MarkTokenUsedStep);
  });

  afterAll(async () => {
    await app.close();
  });

  // ---------------------------------------------------------------------------
  // Happy path
  // ---------------------------------------------------------------------------

  describe('Given a customer with a valid password reset token', () => {
    describe('When they submit the token with a strong new password', () => {
      it('Then they receive a 200 OK with a success message', async () => {
        const { plainToken } = await setupUserWithResetToken(
          'reset1@example.com',
          'resetuser1',
        );

        const res = await request(app.getHttpServer())
          .post('/api/authentication/reset-password')
          .send({ token: plainToken, newPassword: 'NewSecurePass1' });

        expect(res.status).toBe(HttpStatus.OK);
        expect(res.body.message).toBe('Password has been reset successfully');
      });

      it('Then the reset token is marked as used in the database', async () => {
        const { plainToken } = await setupUserWithResetToken(
          'reset2@example.com',
          'resetuser2',
        );

        const { AuthenticationDomainService } = await import(
          '@authentication/domain/services/authentication-domain.service'
        );
        const tokenHash = AuthenticationDomainService.hashToken(plainToken);

        await request(app.getHttpServer())
          .post('/api/authentication/reset-password')
          .send({ token: plainToken, newPassword: 'NewSecurePass1' });

        const [tokenRow] = await dataSource.query(
          `SELECT used_at FROM password_reset_tokens WHERE token_hash = $1`,
          [tokenHash],
        );

        expect(tokenRow.used_at).not.toBeNull();
      });

      it('Then all active sessions for the user are archived in the database', async () => {
        const email = 'reset3@example.com';
        const { plainToken } = await setupUserWithResetToken(email, 'resetuser3');

        // Sign in to create an additional session
        await request(app.getHttpServer())
          .post('/api/authentication/sign-in')
          .send({ emailOrUsername: email, password: 'SecurePass1' });

        const [user] = await dataSource.query(
          `SELECT id FROM users WHERE email = $1`,
          [email],
        );

        const activeBefore = await dataSource.query(
          `SELECT COUNT(*) as count FROM sessions WHERE user_id = $1 AND archived_at IS NULL`,
          [user.id],
        );
        expect(parseInt(activeBefore[0].count)).toBeGreaterThan(0);

        await request(app.getHttpServer())
          .post('/api/authentication/reset-password')
          .send({ token: plainToken, newPassword: 'NewSecurePass1' });

        const activeAfter = await dataSource.query(
          `SELECT COUNT(*) as count FROM sessions WHERE user_id = $1 AND archived_at IS NULL`,
          [user.id],
        );

        expect(parseInt(activeAfter[0].count)).toBe(0);
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Error cases
  // ---------------------------------------------------------------------------

  describe('Given a customer who submits an invalid or non-existent token', () => {
    describe('When they call the reset-password endpoint', () => {
      it('Then they receive a 401 Unauthorized', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/authentication/reset-password')
          .send({ token: 'completely-invalid-token', newPassword: 'NewSecurePass1' });

        expect(res.status).toBe(HttpStatus.UNAUTHORIZED);
      });
    });
  });

  describe('Given a customer who tries to reuse a token that was already consumed', () => {
    describe('When they call reset-password a second time with the same token', () => {
      it('Then they receive a 401 Unauthorized on the second attempt', async () => {
        const { plainToken } = await setupUserWithResetToken(
          'reset4@example.com',
          'resetuser4',
        );

        await request(app.getHttpServer())
          .post('/api/authentication/reset-password')
          .send({ token: plainToken, newPassword: 'NewSecurePass1' });

        const secondAttempt = await request(app.getHttpServer())
          .post('/api/authentication/reset-password')
          .send({ token: plainToken, newPassword: 'AnotherNewPass1' });

        expect(secondAttempt.status).toBe(HttpStatus.UNAUTHORIZED);
      });
    });
  });

  describe('Given a customer who submits a weak new password', () => {
    describe('When the new password does not meet strength requirements', () => {
      it('Then they receive a 400 Bad Request', async () => {
        const { plainToken } = await setupUserWithResetToken(
          'reset5@example.com',
          'resetuser5',
        );

        const res = await request(app.getHttpServer())
          .post('/api/authentication/reset-password')
          .send({ token: plainToken, newPassword: 'weak' });

        expect(res.status).toBe(HttpStatus.BAD_REQUEST);
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Rollback — session archiving fails → token NOT marked as used
  // ---------------------------------------------------------------------------

  describe('Given the session archiving fails after the token is marked as used', () => {
    describe('When the database rejects the session archive mid-transaction', () => {
      it('Then the transaction is rolled back and the token remains valid (not marked as used)', async () => {
        const { plainToken } = await setupUserWithResetToken(
          'rollback.reset@example.com',
          'rollbackreset',
        );

        const { AuthenticationDomainService } = await import(
          '@authentication/domain/services/authentication-domain.service'
        );
        const tokenHash = AuthenticationDomainService.hashToken(plainToken);

        const spy = jest
          .spyOn(markTokenUsedStep, 'execute')
          .mockRejectedValueOnce(new Error('Token persist failed mid-transaction'));

        const res = await request(app.getHttpServer())
          .post('/api/authentication/reset-password')
          .send({ token: plainToken, newPassword: 'NewSecurePass1' });

        expect(res.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);

        // Token must still be valid (used_at should be NULL — rollback succeeded)
        const [tokenRow] = await dataSource.query(
          `SELECT used_at FROM password_reset_tokens WHERE token_hash = $1`,
          [tokenHash],
        );

        expect(tokenRow.used_at).toBeNull();
        spy.mockRestore();
      });
    });
  });
});

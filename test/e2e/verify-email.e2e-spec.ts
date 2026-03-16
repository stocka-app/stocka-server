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
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      const tables = [
        'password_reset_tokens',
        'users',
        'sessions',
        'email_verification_tokens',
        'verification_attempts',
      ];
      for (const table of tables) {
        await dataSource.query(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE`);
      }
    }
    await app.close();
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

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

describe('Get Me (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let emailProvider: jest.Mocked<IEmailProviderContract>;

  // Helper: sign up a user and return their access token
  async function signUpAndGetToken(email: string, username: string): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/api/authentication/sign-up')
      .send({ email, username, password: 'SecurePass1' });
    return res.body.accessToken as string;
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
          synchronize: true,
          dropSchema: true,
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
      await dataSource.query('DELETE FROM email_verification_tokens');
      await dataSource.query('DELETE FROM sessions');
      await dataSource.query('DELETE FROM users');
    }
  });

  // ---------------------------------------------------------------------------
  // Happy path
  // ---------------------------------------------------------------------------

  describe('Given an authenticated user with a valid access token', () => {
    describe('When they call GET /api/authentication/me', () => {
      it('Then they receive a 200 with their profile: id, email, username, and createdAt', async () => {
        const token = await signUpAndGetToken('me1@example.com', 'meuser1');

        const res = await request(app.getHttpServer())
          .get('/api/authentication/me')
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
    describe('When they call GET /api/authentication/me', () => {
      it('Then they receive a 401 Unauthorized', async () => {
        const res = await request(app.getHttpServer()).get('/api/authentication/me');

        expect(res.status).toBe(HttpStatus.UNAUTHORIZED);
      });
    });
  });

  describe('Given a client that presents a malformed or tampered JWT', () => {
    describe('When they call GET /api/authentication/me', () => {
      it('Then they receive a 401 Unauthorized', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/authentication/me')
          .set('Authorization', 'Bearer this.is.not.a.valid.jwt');

        expect(res.status).toBe(HttpStatus.UNAUTHORIZED);
      });
    });
  });
});

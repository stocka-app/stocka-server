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
import { CreateSignInSessionStep } from '@authentication/application/sagas/sign-in/steps';

describe('Sign In (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let emailProvider: jest.Mocked<IEmailProviderContract>;
  let createSignInSessionStep: CreateSignInSessionStep;

  const BASE_USER = {
    email: 'signin1@example.com',
    username: 'signinuser1',
    password: 'SecurePass1',
  };

  async function signUp(email: string, username: string, password = 'SecurePass1'): Promise<void> {
    await request(app.getHttpServer())
      .post('/api/authentication/sign-up')
      .send({ email, username, password });
    // Bypass email verification — set user to active directly so sign-in can proceed
    await dataSource.query(`UPDATE users SET status = 'active' WHERE email = $1`, [email]);
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
    createSignInSessionStep = moduleFixture.get(CreateSignInSessionStep);

    // Pre-create base user for error-path tests
    await signUp(BASE_USER.email, BASE_USER.username, BASE_USER.password);
  });

  afterAll(async () => {
    await app.close();
  });

  // ---------------------------------------------------------------------------
  // Happy path
  // ---------------------------------------------------------------------------

  describe('Given a customer with a registered account', () => {
    describe('When they sign in using their email and correct password', () => {
      it('Then they receive a 201 with an access token in the body', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/authentication/sign-in')
          .send({ emailOrUsername: BASE_USER.email, password: BASE_USER.password });

        expect(res.status).toBe(HttpStatus.CREATED);
        expect(res.body.accessToken).toBeDefined();
        expect(typeof res.body.accessToken).toBe('string');
      });

      it('Then a refresh token cookie is set in the response', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/authentication/sign-in')
          .send({ emailOrUsername: BASE_USER.email, password: BASE_USER.password });

        const setCookieHeader = res.headers['set-cookie'] as string | string[];
        const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader ?? ''];
        const refreshCookie = cookies.find((c) => c.startsWith('refresh_token='));

        expect(refreshCookie).toBeDefined();
      });

      it('Then a new session is persisted in the database', async () => {
        const [user] = await dataSource.query(
          `SELECT id FROM users WHERE email = $1`,
          [BASE_USER.email],
        );

        const sessionsBefore = await dataSource.query(
          `SELECT COUNT(*) as count FROM sessions WHERE user_id = $1 AND archived_at IS NULL`,
          [user.id],
        );

        await request(app.getHttpServer())
          .post('/api/authentication/sign-in')
          .send({ emailOrUsername: BASE_USER.email, password: BASE_USER.password });

        const sessionsAfter = await dataSource.query(
          `SELECT COUNT(*) as count FROM sessions WHERE user_id = $1 AND archived_at IS NULL`,
          [user.id],
        );

        expect(parseInt(sessionsAfter[0].count)).toBeGreaterThan(
          parseInt(sessionsBefore[0].count),
        );
      });
    });

    describe('When they sign in using their username and correct password', () => {
      it('Then they receive a 201 with an access token in the body', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/authentication/sign-in')
          .send({ emailOrUsername: BASE_USER.username, password: BASE_USER.password });

        expect(res.status).toBe(HttpStatus.CREATED);
        expect(res.body.accessToken).toBeDefined();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Error cases
  // ---------------------------------------------------------------------------

  describe('Given a customer who submits the wrong password', () => {
    describe('When they call the sign-in endpoint', () => {
      it('Then they receive a 401 Unauthorized', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/authentication/sign-in')
          .send({ emailOrUsername: BASE_USER.email, password: 'WrongPassword1' });

        expect(res.status).toBe(HttpStatus.UNAUTHORIZED);
      });
    });
  });

  describe('Given a customer who does not have an account', () => {
    describe('When they call the sign-in endpoint with an unknown email', () => {
      it('Then they receive a 401 Unauthorized', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/authentication/sign-in')
          .send({ emailOrUsername: 'ghost@example.com', password: 'SecurePass1' });

        expect(res.status).toBe(HttpStatus.UNAUTHORIZED);
      });
    });
  });

  describe('Given a customer who submits a missing field', () => {
    describe('When the request body is missing the password', () => {
      it('Then they receive a 400 Bad Request from DTO validation', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/authentication/sign-in')
          .send({ emailOrUsername: BASE_USER.email });

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

        const [user] = await dataSource.query(
          `SELECT id FROM users WHERE email = $1`,
          [email],
        );

        const sessionsBefore = await dataSource.query(
          `SELECT COUNT(*) as count FROM sessions WHERE user_id = $1`,
          [user.id],
        );

        const spy = jest
          .spyOn(createSignInSessionStep, 'execute')
          .mockRejectedValueOnce(new Error('Session insert failed mid-transaction'));

        const res = await request(app.getHttpServer())
          .post('/api/authentication/sign-in')
          .send({ emailOrUsername: email, password: 'SecurePass1' });

        expect(res.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);

        const sessionsAfter = await dataSource.query(
          `SELECT COUNT(*) as count FROM sessions WHERE user_id = $1`,
          [user.id],
        );

        // No extra session was persisted (rollback confirmed)
        expect(parseInt(sessionsAfter[0].count)).toBe(parseInt(sessionsBefore[0].count));
        spy.mockRestore();
      });
    });
  });
});

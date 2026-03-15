import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import * as bcrypt from 'bcrypt';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AuthenticationModule } from '@authentication/infrastructure/authentication.module';
import { UserModule } from '@user/infrastructure/user.module';
import { MediatorModule } from '@shared/infrastructure/mediator/mediator.module';
import { EmailModule } from '@shared/infrastructure/email/email.module';
import { UnitOfWorkModule } from '@shared/infrastructure/database/unit-of-work.module';
import { UserEntity } from '@user/infrastructure/persistence/entities/user.entity';
import { CreateSignInSessionStep } from '@authentication/application/sagas/sign-in/steps';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { IEmailProviderContract } from '@shared/infrastructure/email/contracts/email-provider.contract';
import { DomainExceptionFilter } from '@common/filters/domain-exception.filter';
import { validate } from '@core/config/environment/env.validation';
import databaseConfig from '@core/config/database/database.config';

describe('Sign In (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let emailProvider: jest.Mocked<IEmailProviderContract>;
  let createSignInSessionStep: CreateSignInSessionStep;

  // Helper for rollback tests — uses HTTP so it runs through UoW/saga.
  // Safe since UnitOfWorkIsolationMiddleware isolates ALS per request.
  async function signUp(email: string, username: string, password = 'SecurePass1'): Promise<void> {
    await request(app.getHttpServer())
      .post('/api/authentication/sign-up')
      .send({ email, username, password });
    await dataSource.query(
      `UPDATE users SET status = 'active', email_verified_at = NOW() WHERE email = $1`,
      [email],
    );
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
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.setGlobalPrefix('api');
    app.useGlobalFilters(new DomainExceptionFilter());

    await app.init();
    dataSource = moduleFixture.get(DataSource);
    createSignInSessionStep = moduleFixture.get(CreateSignInSessionStep);

    // Seed base verified user directly via TypeORM — no HTTP/saga/UoW involved.
    // Avoids ALS context leak from sagas running before sign-in tests.
    // Sign-in requires: status='active', emailVerifiedAt set, and known passwordHash.
    const passwordHash = await bcrypt.hash('SecurePass1', 10);
    await dataSource.getRepository(UserEntity).save({
      email: 'signin@example.com',
      username: 'signinuser',
      passwordHash,
      status: 'active',
      emailVerifiedAt: new Date(),
      createdWith: 'email',
      accountType: 'manual',
    });
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

  beforeEach(() => {
    jest.resetAllMocks();
    emailProvider.sendEmail.mockResolvedValue({ id: 'mock-id', success: true });
    emailProvider.sendVerificationEmail.mockResolvedValue({ id: 'mock-id', success: true });
    emailProvider.sendWelcomeEmail.mockResolvedValue({ id: 'mock-id', success: true });
    emailProvider.sendPasswordResetEmail.mockResolvedValue({ id: 'mock-id', success: true });
  });

  // ---------------------------------------------------------------------------
  // Happy path — email login
  // ---------------------------------------------------------------------------

  describe('Given a registered user with valid credentials', () => {
    describe('When they sign in using their email address', () => {
      it('Then they receive a 200 with their profile, access token, and emailVerificationRequired flag', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/authentication/sign-in')
          .send({ emailOrUsername: 'signin@example.com', password: 'SecurePass1' });

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
          .send({ emailOrUsername: 'signin@example.com', password: 'SecurePass1' });

        expect(res.status).toBe(HttpStatus.OK);

        const setCookieHeader = res.headers['set-cookie'] as string | string[] | undefined;
        expect(setCookieHeader).toBeDefined();

        const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader ?? ''];
        const refreshCookie = cookies.find((c) => c.startsWith('refresh_token='));

        expect(refreshCookie).toBeDefined();
        expect(refreshCookie!.toLowerCase()).toContain('httponly');
      });

      it('Then a new session is persisted in the database', async () => {
        const [user] = await dataSource.query(`SELECT id FROM users WHERE email = $1`, [
          'signin@example.com',
        ]);
        const before = await dataSource.query(
          `SELECT COUNT(*) as count FROM sessions WHERE user_id = $1 AND archived_at IS NULL`,
          [user.id],
        );

        await request(app.getHttpServer())
          .post('/api/authentication/sign-in')
          .send({ emailOrUsername: 'signin@example.com', password: 'SecurePass1' });

        const after = await dataSource.query(
          `SELECT COUNT(*) as count FROM sessions WHERE user_id = $1 AND archived_at IS NULL`,
          [user.id],
        );

        expect(parseInt(after[0].count)).toBeGreaterThan(parseInt(before[0].count));
      });
    });

    describe('When they sign in using their username instead of email', () => {
      it('Then they receive a 200 — username-based login is supported', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/authentication/sign-in')
          .send({ emailOrUsername: 'signinuser', password: 'SecurePass1' });

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
          .send({ emailOrUsername: 'ghost@example.com', password: 'SecurePass1' });

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
          .send({ password: 'SecurePass1' });

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

        const [user] = await dataSource.query(`SELECT id FROM users WHERE email = $1`, [email]);
        const before = await dataSource.query(
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

        const after = await dataSource.query(
          `SELECT COUNT(*) as count FROM sessions WHERE user_id = $1`,
          [user.id],
        );

        expect(parseInt(after[0].count)).toBe(parseInt(before[0].count));
        spy.mockRestore();
      });
    });
  });
});

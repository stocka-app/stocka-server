import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
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
import { CreateNewSessionStep } from '@authentication/application/sagas/refresh-session/steps';

describe('Refresh Session (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let createNewSessionStep: CreateNewSessionStep;

  // Helper: sign up a user and return the refresh token cookie
  async function signUpAndGetCookie(
    email: string,
    username: string,
  ): Promise<{ cookie: string; refreshToken: string }> {
    const signUpRes = await request(app.getHttpServer())
      .post('/api/authentication/sign-up')
      .send({ email, username, password: 'SecurePass1' });

    const setCookieHeader = signUpRes.headers['set-cookie'] as string | string[];
    const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader ?? ''];
    const refreshCookie = cookies.find((c) => c.startsWith('refresh_token=')) ?? '';
    const refreshToken = refreshCookie.split('=')[1]?.split(';')[0] ?? '';

    return { cookie: refreshCookie, refreshToken };
  }

  beforeAll(async () => {
    const emailProvider: jest.Mocked<IEmailProviderContract> = {
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
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.setGlobalPrefix('api');
    app.useGlobalFilters(new DomainExceptionFilter());

    await app.init();
    dataSource = moduleFixture.get(DataSource);
    createNewSessionStep = moduleFixture.get(CreateNewSessionStep);
  });

  afterAll(async () => {
    await app.close();
  });

  // ---------------------------------------------------------------------------
  // Happy path
  // ---------------------------------------------------------------------------

  describe('Given a customer with a valid refresh token cookie', () => {
    describe('When they call the refresh-session endpoint', () => {
      it('Then they receive a new access token in the response body', async () => {
        const { cookie } = await signUpAndGetCookie('refresh1@example.com', 'refreshuser1');

        const res = await request(app.getHttpServer())
          .post('/api/authentication/refresh-session')
          .set('Cookie', cookie);

        expect(res.status).toBe(HttpStatus.CREATED);
        expect(res.body.accessToken).toBeDefined();
        expect(typeof res.body.accessToken).toBe('string');
      });

      it('Then a new refresh token cookie is set in the response', async () => {
        const { cookie } = await signUpAndGetCookie('refresh2@example.com', 'refreshuser2');

        const res = await request(app.getHttpServer())
          .post('/api/authentication/refresh-session')
          .set('Cookie', cookie);

        const setCookieHeader = res.headers['set-cookie'] as string | string[];
        const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader ?? ''];
        const newRefreshCookie = cookies.find((c) => c.startsWith('refresh_token='));

        expect(newRefreshCookie).toBeDefined();
      });

      it('Then the old session is archived in the database', async () => {
        const { cookie } = await signUpAndGetCookie('refresh3@example.com', 'refreshuser3');

        // Get the original session before refresh
        const [user] = await dataSource.query(
          `SELECT id FROM users WHERE email = 'refresh3@example.com'`,
        );
        const [originalSession] = await dataSource.query(
          `SELECT uuid FROM sessions WHERE user_id = $1 AND archived_at IS NULL`,
          [user.id],
        );

        await request(app.getHttpServer())
          .post('/api/authentication/refresh-session')
          .set('Cookie', cookie);

        const [archivedCheck] = await dataSource.query(
          `SELECT archived_at FROM sessions WHERE uuid = $1`,
          [originalSession.uuid],
        );

        expect(archivedCheck.archived_at).not.toBeNull();
      });

      it('Then a new active session is created in the database', async () => {
        const { cookie } = await signUpAndGetCookie('refresh4@example.com', 'refreshuser4');

        const [user] = await dataSource.query(
          `SELECT id FROM users WHERE email = 'refresh4@example.com'`,
        );

        const sessionsBefore = await dataSource.query(
          `SELECT COUNT(*) as count FROM sessions WHERE user_id = $1`,
          [user.id],
        );

        await request(app.getHttpServer())
          .post('/api/authentication/refresh-session')
          .set('Cookie', cookie);

        const sessionsAfter = await dataSource.query(
          `SELECT COUNT(*) as count FROM sessions WHERE user_id = $1`,
          [user.id],
        );

        expect(parseInt(sessionsAfter[0].count)).toBe(parseInt(sessionsBefore[0].count) + 1);
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Error cases
  // ---------------------------------------------------------------------------

  describe('Given a customer with no refresh token cookie', () => {
    describe('When they call the refresh-session endpoint without a cookie', () => {
      it('Then they receive a 401 Unauthorized', async () => {
        const res = await request(app.getHttpServer()).post(
          '/api/authentication/refresh-session',
        );

        expect(res.status).toBe(HttpStatus.UNAUTHORIZED);
      });
    });
  });

  describe('Given a customer who presents an invalid or tampered refresh token', () => {
    describe('When they call the refresh-session endpoint', () => {
      it('Then they receive a 401 Unauthorized', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/authentication/refresh-session')
          .set('Cookie', 'refresh_token=tampered.token.value');

        expect(res.status).toBe(HttpStatus.UNAUTHORIZED);
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Rollback — new session creation fails → old session NOT archived
  // ---------------------------------------------------------------------------

  describe('Given the new session creation fails after the old session is archived', () => {
    describe('When the database rejects the new session insert mid-transaction', () => {
      it('Then the transaction is rolled back and the original session remains active', async () => {
        const { cookie } = await signUpAndGetCookie('rollback.refresh@example.com', 'rollbackref');

        const [user] = await dataSource.query(
          `SELECT id FROM users WHERE email = 'rollback.refresh@example.com'`,
        );
        const [originalSession] = await dataSource.query(
          `SELECT uuid FROM sessions WHERE user_id = $1 AND archived_at IS NULL`,
          [user.id],
        );

        const spy = jest
          .spyOn(createNewSessionStep, 'execute')
          .mockRejectedValueOnce(new Error('Session insert failed mid-transaction'));

        const res = await request(app.getHttpServer())
          .post('/api/authentication/refresh-session')
          .set('Cookie', cookie);

        expect(res.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);

        // Original session must still be active (archive rolled back)
        const [sessionCheck] = await dataSource.query(
          `SELECT archived_at FROM sessions WHERE uuid = $1`,
          [originalSession.uuid],
        );

        expect(sessionCheck.archived_at).toBeNull();
        spy.mockRestore();
      });
    });
  });
});

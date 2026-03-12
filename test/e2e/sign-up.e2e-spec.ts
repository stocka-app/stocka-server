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
import {
  CreateSessionStep,
  CreateVerificationTokenStep,
} from '@authentication/application/sagas/sign-up/steps';

describe('Sign Up (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let emailProvider: jest.Mocked<IEmailProviderContract>;
  let createSessionStep: CreateSessionStep;
  let createVerificationTokenStep: CreateVerificationTokenStep;

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
    createSessionStep = moduleFixture.get(CreateSessionStep);
    createVerificationTokenStep = moduleFixture.get(CreateVerificationTokenStep);
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

  describe('Given a new user with valid credentials', () => {
    describe('When they submit the sign-up form', () => {
      it('Then they receive a 201 with their profile, access token, and emailSent=true', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/authentication/sign-up')
          .send({ email: 'new@example.com', username: 'newuser', password: 'SecurePass1' });

        expect(response.status).toBe(HttpStatus.CREATED);
        expect(response.body.user.email).toBe('new@example.com');
        expect(response.body.user.username).toBe('newuser');
        expect(response.body.user.id).toBeDefined();
        expect(response.body.user.createdAt).toBeDefined();
        expect(response.body.accessToken).toBeDefined();
        expect(response.body.emailSent).toBe(true);
      });

      it('Then a refresh token cookie is set as HttpOnly in the response', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/authentication/sign-up')
          .send({ email: 'cookie@example.com', username: 'cookieuser', password: 'SecurePass1' });

        expect(response.status).toBe(HttpStatus.CREATED);
        const setCookieHeader = response.headers['set-cookie'] as string[] | string | undefined;
        expect(setCookieHeader).toBeDefined();
        const cookieStr = Array.isArray(setCookieHeader)
          ? setCookieHeader[0]
          : String(setCookieHeader);
        expect(cookieStr).toContain('refresh_token');
        expect(cookieStr.toLowerCase()).toContain('httponly');
      });

      it('Then a verification email is sent to the registered address', async () => {
        await request(app.getHttpServer())
          .post('/api/authentication/sign-up')
          .send({ email: 'verify@example.com', username: 'verifyuser', password: 'SecurePass1' });

        expect(emailProvider.sendVerificationEmail).toHaveBeenCalledTimes(1);
        expect(emailProvider.sendVerificationEmail).toHaveBeenCalledWith(
          'verify@example.com',
          expect.any(String),
          'verifyuser',
          expect.any(String),
        );
      });

      it('Then the verification email is sent only after the user is persisted in the database', async () => {
        const callOrder: string[] = [];

        // Track DB write by checking the user exists after signup
        let userExistsAtEmailTime = false;
        emailProvider.sendVerificationEmail.mockImplementation(async () => {
          const [row] = await dataSource.query(
            `SELECT id FROM users WHERE email = 'order@example.com'`,
          );
          userExistsAtEmailTime = !!row;
          return { id: 'mock-id', success: true };
        });

        await request(app.getHttpServer())
          .post('/api/authentication/sign-up')
          .send({ email: 'order@example.com', username: 'orderuser', password: 'SecurePass1' });

        expect(callOrder).not.toContain('email-before-commit');
        expect(userExistsAtEmailTime).toBe(true);
      });
    });
  });

  describe('Given the email provider fails after the user is saved', () => {
    describe('When the email service is down', () => {
      it('Then the user is still registered, receives a 201, and emailSent=false (local-first guarantee)', async () => {
        emailProvider.sendVerificationEmail.mockRejectedValue(new Error('SMTP server down'));

        const response = await request(app.getHttpServer())
          .post('/api/authentication/sign-up')
          .send({
            email: 'localfirst@example.com',
            username: 'localfirstuser',
            password: 'SecurePass1',
          });

        expect(response.status).toBe(HttpStatus.CREATED);
        expect(response.body.user.email).toBe('localfirst@example.com');
        expect(response.body.accessToken).toBeDefined();
        expect(response.body.emailSent).toBe(false);

        const [savedUser] = await dataSource.query(
          `SELECT id FROM users WHERE email = 'localfirst@example.com'`,
        );
        expect(savedUser).toBeDefined();
      }, 15000); // email step has retry: 3 attempts × backoff delays
    });
  });

  describe('Given a DB failure mid-transaction during session creation', () => {
    describe('When session creation fails after the user was already inserted', () => {
      it('Then the entire transaction is rolled back and the user does not exist in the DB', async () => {
        const spy = jest
          .spyOn(createSessionStep, 'execute')
          .mockRejectedValueOnce(new Error('DB connection lost mid-transaction'));

        const response = await request(app.getHttpServer())
          .post('/api/authentication/sign-up')
          .send({ email: 'rollback@example.com', username: 'rollbackuser', password: 'SecurePass1' });

        expect(response.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);

        const [user] = await dataSource.query(
          `SELECT id FROM users WHERE email = 'rollback@example.com'`,
        );
        expect(user).toBeUndefined();

        spy.mockRestore();
      });
    });
  });

  describe('Given a DB failure mid-transaction during verification token creation', () => {
    describe('When the last transactional step fails after the user and session were already inserted', () => {
      it('Then the entire transaction is rolled back — user, session, and tokens do not exist', async () => {
        const spy = jest
          .spyOn(createVerificationTokenStep, 'execute')
          .mockRejectedValueOnce(new Error('Foreign key violation'));

        const response = await request(app.getHttpServer())
          .post('/api/authentication/sign-up')
          .send({ email: 'deeproll@example.com', username: 'deeprolluser', password: 'SecurePass1' });

        expect(response.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);

        const [user] = await dataSource.query(
          `SELECT id FROM users WHERE email = 'deeproll@example.com'`,
        );
        expect(user).toBeUndefined();

        const [session] = await dataSource.query(
          `SELECT id FROM sessions WHERE id IS NOT NULL LIMIT 1`,
        );
        // No sessions should exist since the whole transaction was rolled back
        expect(session).toBeUndefined();

        spy.mockRestore();
      });
    });
  });

  describe('Given a user attempts to register with an email already in use', () => {
    describe('When they submit the sign-up form', () => {
      it('Then they receive a 409 Conflict with EMAIL_ALREADY_EXISTS error code', async () => {
        await request(app.getHttpServer())
          .post('/api/authentication/sign-up')
          .send({ email: 'taken@example.com', username: 'firstuser', password: 'SecurePass1' });

        const response = await request(app.getHttpServer())
          .post('/api/authentication/sign-up')
          .send({ email: 'taken@example.com', username: 'otherusernm', password: 'SecurePass1' });

        expect(response.status).toBe(HttpStatus.CONFLICT);
        expect(response.body.error).toBe('EMAIL_ALREADY_EXISTS');
      });
    });
  });

  describe('Given a user attempts to register with a username already taken', () => {
    describe('When they submit the sign-up form', () => {
      it('Then they receive a 409 Conflict with USERNAME_ALREADY_EXISTS error code', async () => {
        await request(app.getHttpServer())
          .post('/api/authentication/sign-up')
          .send({ email: 'first@example.com', username: 'takenuser', password: 'SecurePass1' });

        const response = await request(app.getHttpServer())
          .post('/api/authentication/sign-up')
          .send({ email: 'second@example.com', username: 'takenuser', password: 'SecurePass1' });

        expect(response.status).toBe(HttpStatus.CONFLICT);
        expect(response.body.error).toBe('USERNAME_ALREADY_EXISTS');
      });
    });
  });

  describe('Given a user submits a password that does not meet the security requirements', () => {
    describe('When the password is too short', () => {
      it('Then they receive a 400 Bad Request', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/authentication/sign-up')
          .send({ email: 'weak@example.com', username: 'weakuser', password: 'short' });

        expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      });
    });

    describe('When the password has no uppercase letter or number', () => {
      it('Then they receive a 400 or 422 with a validation error', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/authentication/sign-up')
          .send({ email: 'nostrong@example.com', username: 'nostronguser', password: 'alllowercase' });

        expect([HttpStatus.BAD_REQUEST, HttpStatus.UNPROCESSABLE_ENTITY]).toContain(
          response.status,
        );
      });
    });
  });

  describe('Given a user submits the form with missing required fields', () => {
    describe('When the email field is absent', () => {
      it('Then they receive a 400 Bad Request', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/authentication/sign-up')
          .send({ username: 'nomail', password: 'SecurePass1' });

        expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      });
    });

    describe('When the username field is absent', () => {
      it('Then they receive a 400 Bad Request', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/authentication/sign-up')
          .send({ email: 'nouser@example.com', password: 'SecurePass1' });

        expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      });
    });

    describe('When the password field is absent', () => {
      it('Then they receive a 400 Bad Request', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/authentication/sign-up')
          .send({ email: 'nopass@example.com', username: 'nopassuser' });

        expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      });
    });
  });

  describe('Given a user submits an invalid email format', () => {
    describe('When the email is malformed', () => {
      it('Then they receive a 400 Bad Request', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/authentication/sign-up')
          .send({ email: 'not-an-email', username: 'bademail', password: 'SecurePass1' });

        expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      });
    });
  });
});

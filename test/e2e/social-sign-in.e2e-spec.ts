import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { CommandBus } from '@nestjs/cqrs';
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
import { SocialSignInCommand } from '@authentication/application/commands/social-sign-in/social-sign-in.command';
import { CreateSocialSessionStep } from '@authentication/application/sagas/social-sign-in/steps';

describe('Social Sign In (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let commandBus: CommandBus;
  let createSocialSessionStep: CreateSocialSessionStep;

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
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.setGlobalPrefix('api');
    app.useGlobalFilters(new DomainExceptionFilter());

    await app.init();
    dataSource = moduleFixture.get(DataSource);
    commandBus = moduleFixture.get(CommandBus);
    createSocialSessionStep = moduleFixture.get(CreateSocialSessionStep);
  });

  afterAll(async () => {
    await app.close();
  });

  // ---------------------------------------------------------------------------
  // Path C — new user (tested first so subsequent tests can reuse the created user)
  // ---------------------------------------------------------------------------

  describe('Given a brand-new visitor who has never used Stocka', () => {
    describe('When they authenticate via Google for the first time', () => {
      it('Then the system creates their account and returns valid tokens', async () => {
        const result = await commandBus.execute(
          new SocialSignInCommand(
            'newgoogle@example.com',
            'Google User',
            'google',
            'google-new-uid-001',
          ),
        );

        expect(result.accessToken).toBeDefined();
        expect(result.refreshToken).toBeDefined();
        expect(result.user.email).toBe('newgoogle@example.com');
      });

      it('Then their account is persisted in the database', async () => {
        const [user] = await dataSource.query(
          `SELECT id, email FROM users WHERE email = 'newgoogle@example.com'`,
        );

        expect(user).toBeDefined();
        expect(user.email).toBe('newgoogle@example.com');
      });

      it('Then a session is persisted in the database for their account', async () => {
        const [user] = await dataSource.query(
          `SELECT id FROM users WHERE email = 'newgoogle@example.com'`,
        );
        const [session] = await dataSource.query(
          `SELECT id FROM sessions WHERE user_id = $1`,
          [user.id],
        );

        expect(session).toBeDefined();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Path A — existing provider link (use the user created in Path C above)
  // ---------------------------------------------------------------------------

  describe('Given a customer who already connected their Google account to Stocka', () => {
    describe('When they sign in with Google again', () => {
      it('Then the system recognises the provider link and signs them in without creating a new account', async () => {
        const before = await dataSource.query(
          `SELECT COUNT(*) as count FROM users WHERE email = 'newgoogle@example.com'`,
        );

        const result = await commandBus.execute(
          new SocialSignInCommand(
            'newgoogle@example.com',
            'Google User',
            'google',
            'google-new-uid-001', // same providerId as before
          ),
        );

        const after = await dataSource.query(
          `SELECT COUNT(*) as count FROM users WHERE email = 'newgoogle@example.com'`,
        );

        expect(result.accessToken).toBeDefined();
        expect(parseInt(after[0].count)).toBe(parseInt(before[0].count)); // no new user created
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Path B — link provider to existing email-based account
  // ---------------------------------------------------------------------------

  describe('Given a customer who registered manually and now signs in with Google', () => {
    describe('When they use the same email as their manual account for the first time', () => {
      it('Then Google is linked to their existing account and they receive valid tokens', async () => {
        // Pre-setup: create a manual user via sign-up
        await request(app.getHttpServer())
          .post('/api/authentication/sign-up')
          .send({ email: 'manual.then.oauth@example.com', username: 'manualthen', password: 'SecurePass1' });

        const result = await commandBus.execute(
          new SocialSignInCommand(
            'manual.then.oauth@example.com',
            'Manual Then OAuth',
            'google',
            'google-link-uid-002',
          ),
        );

        expect(result.accessToken).toBeDefined();
        expect(result.user.email).toBe('manual.then.oauth@example.com');
      });

      it('Then no new user account is created — only the existing one is updated', async () => {
        const rows = await dataSource.query(
          `SELECT COUNT(*) as count FROM users WHERE email = 'manual.then.oauth@example.com'`,
        );

        expect(parseInt(rows[0].count)).toBe(1);
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Rollback — Path C fails at session creation
  // ---------------------------------------------------------------------------

  describe('Given the session creation step fails during a new-user social sign-in', () => {
    describe('When the database rejects the session insert mid-transaction', () => {
      it('Then the entire transaction is rolled back and the new user does not exist in the DB', async () => {
        const spy = jest
          .spyOn(createSocialSessionStep, 'execute')
          .mockRejectedValueOnce(new Error('Session insert failed'));

        await expect(
          commandBus.execute(
            new SocialSignInCommand(
              'rollback.social@example.com',
              'Rollback Social',
              'google',
              'google-rollback-uid-003',
            ),
          ),
        ).rejects.toThrow('Session insert failed');

        const [user] = await dataSource.query(
          `SELECT id FROM users WHERE email = 'rollback.social@example.com'`,
        );

        expect(user).toBeUndefined();
        spy.mockRestore();
      });
    });
  });
});

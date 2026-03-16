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

describe('Authentication Providers (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

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

  // ---------------------------------------------------------------------------
  // Public endpoint — no auth required
  // ---------------------------------------------------------------------------

  describe('Given any client without authentication', () => {
    describe('When they call GET /api/authentication/providers', () => {
      it('Then they receive a 200 with providers array and emailPasswordEnabled: true', async () => {
        const res = await request(app.getHttpServer()).get('/api/authentication/providers');

        expect(res.status).toBe(HttpStatus.OK);
        expect(Array.isArray(res.body.providers)).toBe(true);
        expect(res.body.emailPasswordEnabled).toBe(true);
      });

      it('Then each provider in the list has the required shape: id, name, enabled, authUrl', async () => {
        const res = await request(app.getHttpServer()).get('/api/authentication/providers');

        expect(res.status).toBe(HttpStatus.OK);

        for (const provider of res.body.providers as unknown[]) {
          const p = provider as Record<string, unknown>;
          expect(typeof p['id']).toBe('string');
          expect(typeof p['name']).toBe('string');
          expect(typeof p['enabled']).toBe('boolean');
          expect(typeof p['authUrl']).toBe('string');
        }
      });
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthenticationModule } from '@authentication/infrastructure/authentication.module';
import { UserModule } from '@user/infrastructure/user.module';
import { EmailModule } from '@shared/infrastructure/email/email.module';
import { MediatorModule } from '@shared/infrastructure/mediator/mediator.module';
import { UnitOfWorkModule } from '@shared/infrastructure/database/unit-of-work.module';
import databaseConfig from '@core/config/database/database.config';
import { validate } from '@core/config/environment/env.validation';

describe('Password Reset (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
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
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    // Limpieza de datos: solo borrar datos creados
    const { DataSource } = require('typeorm');
    const dataSource = app.get(DataSource);
    if (dataSource && dataSource.isInitialized) {
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

  it('should request password reset and send email', async () => {
    const email = 'testuser@example.com';
    // Simulate user creation (or ensure user exists)
    // ...
    const res = await request(app.getHttpServer())
      .post('/authentication/forgot-password')
      .send({ email })
      .expect(HttpStatus.OK);
    expect(res.body.message).toContain('reset link has been sent');
    // Optionally, check email provider mock/spies for email sent
  });

  it('should not reveal if email does not exist', async () => {
    const email = 'nonexistent@example.com';
    const res = await request(app.getHttpServer())
      .post('/authentication/forgot-password')
      .send({ email })
      .expect(HttpStatus.OK);
    expect(res.body.message).toContain('reset link has been sent');
  });

  // Add more tests for token usage, expiration, invalid token, etc.
});

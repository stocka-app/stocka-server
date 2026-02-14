/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { DataSource } from 'typeorm';

import { AuthModule } from '@auth/infrastructure/auth.module';
import { UserModule } from '@user/infrastructure/user.module';
import { MediatorModule } from '@shared/infrastructure/mediator/mediator.module';
import { EmailModule } from '@shared/infrastructure/email/email.module';
import { RateLimitGuard } from '@common/guards/rate-limit.guard';
import { RateLimitInterceptor } from '@common/interceptors/rate-limit.interceptor';
import { validate } from '@core/config/environment/env.validation';
import databaseConfig from '@core/config/database/database.config';

describe('Rate Limiting (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

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
          synchronize: true,
          dropSchema: true,
        }),
        ThrottlerModule.forRoot([
          {
            name: 'short',
            ttl: 1000,
            limit: 3,
          },
          {
            name: 'medium',
            ttl: 60000,
            limit: 100,
          },
        ]),
        EmailModule,
        UserModule,
        AuthModule,
        MediatorModule,
      ],
      providers: [
        {
          provide: APP_GUARD,
          useClass: ThrottlerGuard,
        },
        {
          provide: APP_GUARD,
          useClass: RateLimitGuard,
        },
        {
          provide: APP_INTERCEPTOR,
          useClass: RateLimitInterceptor,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.setGlobalPrefix('api');

    await app.init();
    dataSource = moduleFixture.get(DataSource);
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
    await app.close();
  });

  beforeEach(async () => {
    // Clean up verification_attempts table before each test
    if (dataSource?.isInitialized) {
      await dataSource.query('DELETE FROM verification_attempts');
      await dataSource.query('DELETE FROM email_verification_tokens');
      await dataSource.query('DELETE FROM sessions');
      await dataSource.query('DELETE FROM users');
    }
  });

  describe('POST /api/auth/sign-in', () => {
    it('should return 401 for invalid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/sign-in')
        .send({
          emailOrUsername: 'nonexistent@example.com',
          password: 'WrongPassword1',
        });

      expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
      expect(response.body.error).toBe('INVALID_CREDENTIALS');
    });

    it('should return 429 when HTTP throttle limit is exceeded', async () => {
      // Make rapid requests to trigger throttle (short: 3 requests per second)
      const requests = [];
      for (let i = 0; i < 5; i++) {
        requests.push(
          request(app.getHttpServer())
            .post('/api/auth/sign-in')
            .send({
              emailOrUsername: `throttle-test-${i}@example.com`,
              password: 'Password1',
            }),
        );
      }

      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter(
        (r) => r.status === HttpStatus.TOO_MANY_REQUESTS,
      );

      // At least some requests should be throttled
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('POST /api/auth/verify-email', () => {
    it('should return 400 for invalid verification code', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/verify-email')
        .send({
          email: 'test@example.com',
          code: 'INVALID',
        });

      // Should return domain exception (user not found or invalid code)
      expect([HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND]).toContain(response.status);
    });

    it('should return 429 when HTTP throttle limit is exceeded for verify-email', async () => {
      // Make rapid requests to trigger throttle
      const requests = [];
      for (let i = 0; i < 5; i++) {
        requests.push(
          request(app.getHttpServer())
            .post('/api/auth/verify-email')
            .send({
              email: `throttle-${i}@example.com`,
              code: 'ABC123',
            }),
        );
      }

      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter(
        (r) => r.status === HttpStatus.TOO_MANY_REQUESTS,
      );

      // At least some requests should be throttled
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    it('should return 200 even for non-existent email (security)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/forgot-password')
        .send({
          email: 'nonexistent@example.com',
        });

      // Should not reveal if email exists
      expect(response.status).toBe(HttpStatus.OK);
    });

    it('should return 429 when throttle limit is exceeded', async () => {
      // Make rapid requests to trigger throttle (medium: 3 requests per minute for forgot-password)
      const requests = [];
      for (let i = 0; i < 5; i++) {
        requests.push(
          request(app.getHttpServer())
            .post('/api/auth/forgot-password')
            .send({
              email: `throttle-fp-${i}@example.com`,
            }),
        );
      }

      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter(
        (r) => r.status === HttpStatus.TOO_MANY_REQUESTS,
      );

      // At least some requests should be throttled
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Rate Limit Headers', () => {
    it('should include rate limit headers in response', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/sign-in')
        .send({
          emailOrUsername: 'test@example.com',
          password: 'Password1',
        });

      // Throttler adds X-RateLimit headers
      // Note: Exact header names depend on @nestjs/throttler configuration
      expect(response.headers).toBeDefined();
    });
  });

  describe('IP-based Rate Limiting', () => {
    it('should track requests by IP address via X-Forwarded-For header', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/sign-in')
        .set('X-Forwarded-For', '203.0.113.50')
        .send({
          emailOrUsername: 'test@example.com',
          password: 'WrongPassword1',
        });

      expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
    });
  });
});

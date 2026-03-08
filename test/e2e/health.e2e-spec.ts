import { describe, it, beforeAll, afterAll } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthModule } from '@core/infrastructure/health/health.module';

describe('Health Check (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5434', 10),
          username: process.env.DB_USERNAME || 'stocka',
          password: process.env.DB_PASSWORD || 'stocka_dev_password',
          database: process.env.DB_DATABASE || 'stocka_db',
          synchronize: false,
        }),
        HealthModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  }, 15000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('GET /api/health', () => {
    describe('Given the application is running with a connected database', () => {
      it('When the health endpoint is called, Then it returns status ok with db connected', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/health')
          .expect(200);

        expect(response.body).toEqual({
          status: 'ok',
          db: 'connected',
        });
      });
    });
  });
});

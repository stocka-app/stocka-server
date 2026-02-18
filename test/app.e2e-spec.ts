import { describe, it, beforeEach, afterAll } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '@core/infrastructure/app.module';
import { DataSource } from 'typeorm';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    const dataSource = app.get(DataSource);
    if (dataSource && dataSource.isInitialized) {
      const tables = ['users', 'sessions', 'email_verification_tokens', 'verification_attempts'];
      for (const table of tables) {
        await dataSource.query(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE`);
      }
    }
    await app.close();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer()).get('/').expect(200).expect('Hello World!');
  });
});

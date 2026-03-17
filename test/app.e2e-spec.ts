import { describe, it, beforeAll, afterAll } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '@core/infrastructure/app.module';
import { DataSource } from 'typeorm';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    // GET / never touches the DB, but clean up the DataSource if initialized.
    try {
      const dataSource = app.get(DataSource);
      if (dataSource && dataSource.isInitialized) {
        const tables = [
          'verification_attempts',
          'email_verification_tokens',
          'password_reset_tokens',
          'sessions',
          'social_accounts',
          'users',
        ];
        for (const table of tables) {
          await dataSource.query(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE`);
        }
      }
    } catch {
      // DataSource may not be available — ignore
    }
    await app.close();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer()).get('/').expect(200).expect('Hello World!');
  });
});

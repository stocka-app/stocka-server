import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { getWorkerApp, truncateWorkerTables } from '@test/worker-app';

describe('Password Reset (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const workerApp = await getWorkerApp();
    app = workerApp.app;
    dataSource = workerApp.dataSource;
  });

  afterAll(async () => {
    await truncateWorkerTables(dataSource);
  });

  it('should request password reset and send email', async () => {
    const email = 'testuser@example.com';
    // Simulate user creation (or ensure user exists)
    // ...
    const res = await request(app.getHttpServer())
      .post('/api/authentication/forgot-password')
      .send({ email })
      .expect(HttpStatus.OK);
    expect(res.body.message).toContain('reset link has been sent');
    // Optionally, check email provider mock/spies for email sent
  });

  it('should not reveal if email does not exist', async () => {
    const email = 'nonexistent@example.com';
    const res = await request(app.getHttpServer())
      .post('/api/authentication/forgot-password')
      .send({ email })
      .expect(HttpStatus.OK);
    expect(res.body.message).toContain('reset link has been sent');
  });

  // Add more tests for token usage, expiration, invalid token, etc.
});

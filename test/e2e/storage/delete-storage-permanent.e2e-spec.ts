import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { getStorageWorkerApp, truncateStorageWorkerTables } from '@test/storage-worker-app';

interface SignInResponse {
  accessToken: string;
}

async function signUp(
  app: INestApplication,
  dataSource: DataSource,
  email: string,
  username: string,
): Promise<void> {
  await request(app.getHttpServer())
    .post('/api/authentication/sign-up')
    .send({ email, username, password: 'SecurePass1!' });
  await dataSource.query(
    `UPDATE "accounts"."credential_accounts"
     SET status = 'active', email_verified_at = NOW()
     WHERE LOWER(email) = LOWER($1)`,
    [email],
  );
}

async function signIn(app: INestApplication, email: string): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/api/authentication/sign-in')
    .send({ emailOrUsername: email, password: 'SecurePass1!' });
  return (res.body as SignInResponse).accessToken;
}

async function completeOnboarding(
  app: INestApplication,
  token: string,
  tenantName: string,
): Promise<void> {
  await request(app.getHttpServer())
    .post('/api/tenant/onboarding/complete')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: tenantName,
      businessType: 'retail',
      country: 'MX',
      timezone: 'America/Mexico_City',
    });
}

describe('DELETE /api/storages/:uuid/permanent (E2E — H-07 stub)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  const TENANT_NAME = 'DeletePermanent E2E Business';
  const OWNER_EMAIL = 'delete.permanent.owner@example.com';
  const OWNER_USERNAME = 'deletepermanentowner';

  let ownerToken: string;

  beforeAll(async () => {
    const workerApp = await getStorageWorkerApp();
    app = workerApp.app;
    dataSource = workerApp.dataSource;
    await truncateStorageWorkerTables(dataSource);

    await signUp(app, dataSource, OWNER_EMAIL, OWNER_USERNAME);
    const tempToken = await signIn(app, OWNER_EMAIL);
    await completeOnboarding(app, tempToken, TENANT_NAME);
    ownerToken = await signIn(app, OWNER_EMAIL);
  });

  afterAll(async () => {
    await truncateStorageWorkerTables(dataSource);
  });

  describe('Given an authenticated OWNER', () => {
    describe('When DELETE /api/storages/:uuid/permanent is called', () => {
      it('Then it returns 501 NOT_IMPLEMENTED (stub until the dedicated story lands)', async () => {
        const anyUUID = '00000000-0000-0000-0000-000000000000';
        const res = await request(app.getHttpServer())
          .delete(`/api/storages/${anyUUID}/permanent`)
          .set('Authorization', `Bearer ${ownerToken}`);

        expect(res.status).toBe(HttpStatus.NOT_IMPLEMENTED);
      });
    });
  });

  describe('Given an unauthenticated client', () => {
    describe('When DELETE /api/storages/:uuid/permanent is called', () => {
      it('Then it returns 401', async () => {
        const anyUUID = '00000000-0000-0000-0000-000000000000';
        const res = await request(app.getHttpServer()).delete(
          `/api/storages/${anyUUID}/permanent`,
        );

        expect(res.status).toBe(HttpStatus.UNAUTHORIZED);
      });
    });
  });
});

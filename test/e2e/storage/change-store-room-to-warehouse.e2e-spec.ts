import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { getStorageWorkerApp, truncateStorageWorkerTables } from '@test/storage-worker-app';

interface SignInResponse { accessToken: string }
interface CreateStorageResponse { storageUUID: string }

async function signUp(app: INestApplication, dataSource: DataSource, email: string, username: string): Promise<void> {
  await request(app.getHttpServer())
    .post('/api/authentication/sign-up')
    .send({ email, username, password: 'SecurePass1!' });
  await dataSource.query(
    `UPDATE "accounts"."credential_accounts" SET status = 'active', email_verified_at = NOW() WHERE LOWER(email) = LOWER($1)`,
    [email],
  );
}

async function signIn(app: INestApplication, email: string): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/api/authentication/sign-in')
    .send({ emailOrUsername: email, password: 'SecurePass1!' });
  return (res.body as SignInResponse).accessToken;
}

async function completeOnboarding(app: INestApplication, token: string, tenantName: string): Promise<void> {
  await request(app.getHttpServer())
    .post('/api/tenant/onboarding/complete')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: tenantName, businessType: 'retail', country: 'MX', timezone: 'America/Mexico_City' });
}

async function setTenantToStarter(dataSource: DataSource, tenantName: string): Promise<void> {
  await dataSource.query(
    `UPDATE "tenants"."tenant_config" tc SET tier = 'STARTER', max_warehouses = 3, max_custom_rooms = 3, max_store_rooms = 3, max_users = 5 FROM "tenants"."tenants" t WHERE t.id = tc.tenant_id AND t.name = $1`,
    [tenantName],
  );
}

async function createStoreRoom(app: INestApplication, token: string, name: string): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/api/storages/store-rooms')
    .set('Authorization', `Bearer ${token}`)
    .send({ name, address: 'Calle 22, CDMX' });
  return (res.body as CreateStorageResponse).storageUUID;
}

describe('PATCH /api/storages/store-rooms/:uuid/convert-to-warehouse (E2E — H-07)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  const TENANT_NAME = 'CvtSrToWh E2E';
  const OWNER_EMAIL = 'cvt.sr.to.wh.owner@example.com';
  const OWNER_USERNAME = 'cvtsrtowhowner';
  let ownerToken: string;

  beforeAll(async () => {
    const workerApp = await getStorageWorkerApp();
    app = workerApp.app;
    dataSource = workerApp.dataSource;
    await truncateStorageWorkerTables(dataSource);
    await signUp(app, dataSource, OWNER_EMAIL, OWNER_USERNAME);
    const tmp = await signIn(app, OWNER_EMAIL);
    await completeOnboarding(app, tmp, TENANT_NAME);
    ownerToken = await signIn(app, OWNER_EMAIL);
    await setTenantToStarter(dataSource, TENANT_NAME);
    ownerToken = await signIn(app, OWNER_EMAIL);
  });

  afterAll(async () => {
    await truncateStorageWorkerTables(dataSource);
  });

  describe('Given an active store room', () => {
    let uuid: string;

    beforeAll(async () => {
      uuid = await createStoreRoom(app, ownerToken, 'CvtSrToWh Alpha');
    });

    it('Then convert-to-warehouse returns 200 and subsequent GET shows WAREHOUSE', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/storages/store-rooms/${uuid}/convert-to-warehouse`)
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(res.status).toBe(HttpStatus.OK);

      const getRes = await request(app.getHttpServer())
        .get(`/api/storages/${uuid}`)
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(getRes.body.type).toBe('WAREHOUSE');
    });
  });

  describe('Given an archived store room', () => {
    let uuid: string;

    beforeAll(async () => {
      uuid = await createStoreRoom(app, ownerToken, 'CvtSrToWh Archived');
      await request(app.getHttpServer())
        .delete(`/api/storages/store-rooms/${uuid}/archive`)
        .set('Authorization', `Bearer ${ownerToken}`);
    });

    it('Then convert returns 409 STORAGE_TYPE_LOCKED_WHILE_ARCHIVED', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/storages/store-rooms/${uuid}/convert-to-warehouse`)
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(res.status).toBe(HttpStatus.CONFLICT);
      expect(res.body.error).toBe('STORAGE_TYPE_LOCKED_WHILE_ARCHIVED');
    });
  });

  describe('Given a frozen store room', () => {
    let uuid: string;

    beforeAll(async () => {
      uuid = await createStoreRoom(app, ownerToken, 'CvtSrToWh Frozen');
      await request(app.getHttpServer())
        .post(`/api/storages/store-rooms/${uuid}/freeze`)
        .set('Authorization', `Bearer ${ownerToken}`);
    });

    it('Then convert returns 409 STORAGE_TYPE_LOCKED_WHILE_FROZEN', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/storages/store-rooms/${uuid}/convert-to-warehouse`)
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(res.status).toBe(HttpStatus.CONFLICT);
      expect(res.body.error).toBe('STORAGE_TYPE_LOCKED_WHILE_FROZEN');
    });
  });

  describe('Given an unauthenticated client', () => {
    it('Then convert returns 401', async () => {
      const fakeUUID = '00000000-0000-0000-0000-000000000000';
      const res = await request(app.getHttpServer())
        .patch(`/api/storages/store-rooms/${fakeUUID}/convert-to-warehouse`);
      expect(res.status).toBe(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('Given a non-existent store room UUID', () => {
    it('Then convert returns 404', async () => {
      const fakeUUID = '00000000-0000-0000-0000-000000000000';
      const res = await request(app.getHttpServer())
        .patch(`/api/storages/store-rooms/${fakeUUID}/convert-to-warehouse`)
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(res.status).toBe(HttpStatus.NOT_FOUND);
    });
  });
});

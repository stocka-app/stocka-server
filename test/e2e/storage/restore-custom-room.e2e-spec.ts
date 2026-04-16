import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { getStorageWorkerApp, truncateStorageWorkerTables } from '@test/storage-worker-app';

interface SignInResponse {
  accessToken: string;
}

interface CreateStorageResponse {
  storageUUID: string;
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

async function setTenantToStarter(dataSource: DataSource, tenantName: string): Promise<void> {
  await dataSource.query(
    `UPDATE "tenants"."tenant_config" tc
     SET tier = 'STARTER',
         max_warehouses = 3,
         max_custom_rooms = 3,
         max_store_rooms = 3,
         max_users = 5
     FROM "tenants"."tenants" t
     WHERE t.id = tc.tenant_id AND t.name = $1`,
    [tenantName],
  );
}

async function createCustomRoom(app: INestApplication, token: string, name: string): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/api/storages/custom-rooms')
    .set('Authorization', `Bearer ${token}`)
    .send({ name, roomType: 'Office', address: 'Local 3, CDMX' });
  return (res.body as CreateStorageResponse).storageUUID;
}

async function archiveCustomRoom(
  app: INestApplication,
  token: string,
  uuid: string,
): Promise<void> {
  await request(app.getHttpServer())
    .delete(`/api/storages/custom-rooms/${uuid}/archive`)
    .set('Authorization', `Bearer ${token}`);
}

describe('POST /api/storages/custom-rooms/:uuid/restore (E2E)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  const TENANT_NAME = 'RestoreCustomRoom E2E Business';
  const OWNER_EMAIL = 'restore.customroom.owner@example.com';
  const OWNER_USERNAME = 'restorecustomroomowner';

  const OTHER_TENANT_NAME = 'RestoreCustomRoom Other E2E Business';
  const OTHER_OWNER_EMAIL = 'restore.customroom.other@example.com';
  const OTHER_OWNER_USERNAME = 'restorecustomroomother';

  let ownerToken: string;
  let otherOwnerToken: string;

  beforeAll(async () => {
    const workerApp = await getStorageWorkerApp();
    app = workerApp.app;
    dataSource = workerApp.dataSource;
    await truncateStorageWorkerTables(dataSource);

    await signUp(app, dataSource, OWNER_EMAIL, OWNER_USERNAME);
    const tempToken = await signIn(app, OWNER_EMAIL);
    await completeOnboarding(app, tempToken, TENANT_NAME);
    ownerToken = await signIn(app, OWNER_EMAIL);
    await setTenantToStarter(dataSource, TENANT_NAME);
    ownerToken = await signIn(app, OWNER_EMAIL);

    await signUp(app, dataSource, OTHER_OWNER_EMAIL, OTHER_OWNER_USERNAME);
    const otherTempToken = await signIn(app, OTHER_OWNER_EMAIL);
    await completeOnboarding(app, otherTempToken, OTHER_TENANT_NAME);
    otherOwnerToken = await signIn(app, OTHER_OWNER_EMAIL);
    await setTenantToStarter(dataSource, OTHER_TENANT_NAME);
    otherOwnerToken = await signIn(app, OTHER_OWNER_EMAIL);
  });

  afterAll(async () => {
    await truncateStorageWorkerTables(dataSource);
  });

  describe('Given an archived custom room', () => {
    let uuid: string;

    beforeAll(async () => {
      uuid = await createCustomRoom(app, ownerToken, 'Restore CR Alpha');
      await archiveCustomRoom(app, ownerToken, uuid);
    });

    describe('When restore is requested', () => {
      it('Then it returns 200 with ACTIVE status and roomType preserved', async () => {
        const res = await request(app.getHttpServer())
          .post(`/api/storages/custom-rooms/${uuid}/restore`)
          .set('Authorization', `Bearer ${ownerToken}`);

        expect(res.status).toBe(HttpStatus.OK);
        expect(res.body.type).toBe('CUSTOM_ROOM');
        expect(res.body.status).toBe('ACTIVE');
        expect(res.body.archivedAt).toBeNull();
        expect(res.body.roomType).toBe('Office');
      });
    });

    describe('When restore is requested again on an already-active custom room', () => {
      it('Then it returns 409 STORAGE_NOT_ARCHIVED', async () => {
        const res = await request(app.getHttpServer())
          .post(`/api/storages/custom-rooms/${uuid}/restore`)
          .set('Authorization', `Bearer ${ownerToken}`);

        expect(res.status).toBe(HttpStatus.CONFLICT);
        expect(res.body.error).toBe('STORAGE_NOT_ARCHIVED');
      });
    });
  });

  describe('Given an unauthenticated client', () => {
    describe('When restore is called without a token', () => {
      it('Then it returns 401', async () => {
        const fakeUUID = '00000000-0000-0000-0000-000000000000';
        const res = await request(app.getHttpServer()).post(
          `/api/storages/custom-rooms/${fakeUUID}/restore`,
        );

        expect(res.status).toBe(HttpStatus.UNAUTHORIZED);
      });
    });
  });

  describe('Given a non-existent custom room UUID', () => {
    describe('When restore is requested', () => {
      it('Then it returns 404 STORAGE_NOT_FOUND', async () => {
        const fakeUUID = '00000000-0000-0000-0000-000000000000';
        const res = await request(app.getHttpServer())
          .post(`/api/storages/custom-rooms/${fakeUUID}/restore`)
          .set('Authorization', `Bearer ${ownerToken}`);

        expect(res.status).toBe(HttpStatus.NOT_FOUND);
        expect(res.body.error).toBe('STORAGE_NOT_FOUND');
      });
    });
  });

  describe('Given an archived custom room owned by another tenant', () => {
    let foreignUUID: string;

    beforeAll(async () => {
      foreignUUID = await createCustomRoom(app, otherOwnerToken, 'Foreign CR');
      await archiveCustomRoom(app, otherOwnerToken, foreignUUID);
    });

    describe('When restore is requested with a token from a different tenant', () => {
      it('Then it returns 404 STORAGE_NOT_FOUND without revealing existence', async () => {
        const res = await request(app.getHttpServer())
          .post(`/api/storages/custom-rooms/${foreignUUID}/restore`)
          .set('Authorization', `Bearer ${ownerToken}`);

        expect(res.status).toBe(HttpStatus.NOT_FOUND);
        expect(res.body.error).toBe('STORAGE_NOT_FOUND');
      });
    });
  });
});

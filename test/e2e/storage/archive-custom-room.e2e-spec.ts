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

async function createCustomRoom(
  app: INestApplication,
  token: string,
  name: string,
): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/api/storages/custom-rooms')
    .set('Authorization', `Bearer ${token}`)
    .send({ name, roomType: 'Office', address: 'Local 3, CDMX' });
  return (res.body as CreateStorageResponse).storageUUID;
}

describe('DELETE /api/storages/custom-rooms/:uuid/archive (E2E — H-07)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  const TENANT_NAME = 'ArchiveCustomRoom E2E Business';
  const OWNER_EMAIL = 'archive.customroom.owner@example.com';
  const OWNER_USERNAME = 'archivecustomroomowner';

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
    await setTenantToStarter(dataSource, TENANT_NAME);
    ownerToken = await signIn(app, OWNER_EMAIL);
  });

  afterAll(async () => {
    await truncateStorageWorkerTables(dataSource);
  });

  describe('Given an active custom room', () => {
    let uuid: string;

    beforeAll(async () => {
      uuid = await createCustomRoom(app, ownerToken, 'Archive Alpha CR');
    });

    describe('When archive is requested', () => {
      it('Then it returns 200 with status ARCHIVED and the custom-room roomType preserved', async () => {
        const res = await request(app.getHttpServer())
          .delete(`/api/storages/custom-rooms/${uuid}/archive`)
          .set('Authorization', `Bearer ${ownerToken}`);

        expect(res.status).toBe(HttpStatus.OK);
        expect(res.body.uuid).toBe(uuid);
        expect(res.body.type).toBe('CUSTOM_ROOM');
        expect(res.body.status).toBe('ARCHIVED');
        expect(res.body.archivedAt).not.toBeNull();
        expect(res.body.roomType).toBe('Office');
      });
    });

    describe('When archive is requested again', () => {
      it('Then it returns 409 STORAGE_ALREADY_ARCHIVED', async () => {
        const res = await request(app.getHttpServer())
          .delete(`/api/storages/custom-rooms/${uuid}/archive`)
          .set('Authorization', `Bearer ${ownerToken}`);

        expect(res.status).toBe(HttpStatus.CONFLICT);
        expect(res.body.error).toBe('STORAGE_ALREADY_ARCHIVED');
      });
    });
  });

  describe('Given an unauthenticated client', () => {
    describe('When archive is called without a token', () => {
      it('Then it returns 401', async () => {
        const fakeUUID = '00000000-0000-0000-0000-000000000000';
        const res = await request(app.getHttpServer()).delete(
          `/api/storages/custom-rooms/${fakeUUID}/archive`,
        );

        expect(res.status).toBe(HttpStatus.UNAUTHORIZED);
      });
    });
  });

  describe('Given a non-existent custom room UUID', () => {
    describe('When archive is requested', () => {
      it('Then it returns 404 STORAGE_NOT_FOUND', async () => {
        const fakeUUID = '00000000-0000-0000-0000-000000000000';
        const res = await request(app.getHttpServer())
          .delete(`/api/storages/custom-rooms/${fakeUUID}/archive`)
          .set('Authorization', `Bearer ${ownerToken}`);

        expect(res.status).toBe(HttpStatus.NOT_FOUND);
        expect(res.body.error).toBe('STORAGE_NOT_FOUND');
      });
    });
  });
});

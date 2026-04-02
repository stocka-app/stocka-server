import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { getStorageWorkerApp, truncateStorageWorkerTables } from '@test/storage-worker-app';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SignInResponse {
  accessToken: string;
}

interface CreateStorageResponse {
  storageUUID: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

async function createStorage(
  app: INestApplication,
  token: string,
  payload: {
    type: 'WAREHOUSE' | 'CUSTOM_ROOM' | 'STORE_ROOM';
    name: string;
    address?: string;
    roomType?: string;
  },
): Promise<string> {
  const routes: Record<string, string> = {
    WAREHOUSE: '/api/storages/warehouses',
    CUSTOM_ROOM: '/api/storages/custom-rooms',
    STORE_ROOM: '/api/storages/store-rooms',
  };
  const { type, ...body } = payload;
  const res = await request(app.getHttpServer())
    .post(routes[type])
    .set('Authorization', `Bearer ${token}`)
    .send({ address: '100 Test St', ...body });
  return (res.body as CreateStorageResponse).storageUUID;
}

// ─── Spec ─────────────────────────────────────────────────────────────────────

describe('DELETE /api/storages/:uuid (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  const TENANT_NAME = 'DeleteStorage E2E Business';
  const OWNER_EMAIL = 'deletestorage.owner@example.com';
  const OWNER_USERNAME = 'deletestorageowner';

  let ownerToken: string;
  let alreadyArchivedUUID: string;

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

    alreadyArchivedUUID = await createStorage(app, ownerToken, {
      type: 'CUSTOM_ROOM',
      name: 'DeleteStorage Pre-Archived Room',
      roomType: 'Archive',
    });

    // Archive it upfront
    await request(app.getHttpServer())
      .delete(`/api/storages/${alreadyArchivedUUID}`)
      .set('Authorization', `Bearer ${ownerToken}`);
  });

  afterAll(async () => {
    await truncateStorageWorkerTables(dataSource);
  });

  describe('Given a non-existent storage UUID', () => {
    describe('When DELETE /api/storages/:uuid is called', () => {
      it('Then it returns 404 (StorageNotFoundError)', async () => {
        const fakeUUID = '00000000-0000-0000-0000-000000000000';
        const res = await request(app.getHttpServer())
          .delete(`/api/storages/${fakeUUID}`)
          .set('Authorization', `Bearer ${ownerToken}`);

        expect(res.status).toBe(HttpStatus.NOT_FOUND);
      });
    });
  });

  describe('Given a tenant with an active storage', () => {
    let storageToArchiveUUID: string;

    beforeAll(async () => {
      storageToArchiveUUID = await createStorage(app, ownerToken, {
        type: 'CUSTOM_ROOM',
        name: 'DeleteStorage Room To Archive',
        roomType: 'Temporary',
      });
    });

    it('Then DELETE returns 204 and GET confirms the storage is archived', async () => {
      const deleteRes = await request(app.getHttpServer())
        .delete(`/api/storages/${storageToArchiveUUID}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(deleteRes.status).toBe(HttpStatus.NO_CONTENT);

      const getRes = await request(app.getHttpServer())
        .get(`/api/storages/${storageToArchiveUUID}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(getRes.status).toBe(HttpStatus.OK);
      expect(getRes.body.uuid).toBe(storageToArchiveUUID);
      expect(getRes.body.archivedAt).not.toBeNull();
      expect(getRes.body.status).toBe('ARCHIVED');
    });
  });

  describe('Given an already archived storage', () => {
    describe('When DELETE /api/storages/:uuid is called again', () => {
      it('Then it returns 409 (StorageAlreadyArchivedError)', async () => {
        const res = await request(app.getHttpServer())
          .delete(`/api/storages/${alreadyArchivedUUID}`)
          .set('Authorization', `Bearer ${ownerToken}`);

        expect(res.status).toBe(HttpStatus.CONFLICT);
        expect(res.body.error).toBe('STORAGE_ALREADY_ARCHIVED');
      });
    });
  });
});

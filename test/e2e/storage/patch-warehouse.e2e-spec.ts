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

async function archiveCustomRoom(
  app: INestApplication,
  token: string,
  uuid: string,
): Promise<void> {
  await request(app.getHttpServer())
    .delete(`/api/storages/custom-rooms/${uuid}/archive`)
    .set('Authorization', `Bearer ${token}`);
}

// ─── Spec ─────────────────────────────────────────────────────────────────────

describe('PATCH /api/storages/warehouses/:uuid (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  const TENANT_NAME = 'PatchWarehouse E2E Business';
  const OWNER_EMAIL = 'patchwarehouse.owner@example.com';
  const OWNER_USERNAME = 'patchwarehouseowner';

  let ownerToken: string;
  let warehouseUUID: string;
  let storeRoomUUID: string;
  let archivedCustomRoomUUID: string;

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

    warehouseUUID = await createStorage(app, ownerToken, {
      type: 'WAREHOUSE',
      name: 'PatchWarehouse Alpha',
      address: 'Av. Industrial 200, CDMX',
    });

    storeRoomUUID = await createStorage(app, ownerToken, {
      type: 'STORE_ROOM',
      name: 'PatchWarehouse Store Room',
    });

    archivedCustomRoomUUID = await createStorage(app, ownerToken, {
      type: 'CUSTOM_ROOM',
      name: 'PatchWarehouse Archived Room',
      roomType: 'Archive',
    });
    await archiveCustomRoom(app, ownerToken, archivedCustomRoomUUID);
  });

  afterAll(async () => {
    await truncateStorageWorkerTables(dataSource);
  });

  describe('Given a non-existent storage UUID', () => {
    describe('When PATCH /api/storages/warehouses/:uuid is called', () => {
      it('Then it returns 404 (StorageNotFoundError)', async () => {
        const fakeUUID = '00000000-0000-0000-0000-000000000000';
        const res = await request(app.getHttpServer())
          .patch(`/api/storages/warehouses/${fakeUUID}`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ name: 'Does Not Exist' });

        expect(res.status).toBe(HttpStatus.NOT_FOUND);
      });
    });
  });

  describe('Given a tenant with an active warehouse', () => {
    describe('When PATCH /api/storages/warehouses/:uuid is called with a new name', () => {
      it('Then it returns 200 with the updated StorageOutDto (post DT-H07-4)', async () => {
        const patchRes = await request(app.getHttpServer())
          .patch(`/api/storages/warehouses/${warehouseUUID}`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ name: 'PatchWarehouse Alpha Renamed' });

        expect(patchRes.status).toBe(HttpStatus.OK);
        expect(patchRes.body.uuid).toBe(warehouseUUID);
        expect(patchRes.body.name).toBe('PatchWarehouse Alpha Renamed');
        expect(patchRes.body.type).toBe('WAREHOUSE');
      });
    });
  });

  describe('Given a tenant with two storages', () => {
    describe('When PATCH is called with a name that already exists on another storage', () => {
      it('Then it returns 409 (StorageNameAlreadyExistsError)', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/api/storages/warehouses/${warehouseUUID}`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ name: 'PatchWarehouse Store Room' });

        expect(res.status).toBe(HttpStatus.CONFLICT);
        expect(res.body.error).toBe('STORAGE_NAME_ALREADY_EXISTS');
      });
    });
  });

  describe('Given an active warehouse and the same name is sent again', () => {
    describe('When PATCH /api/storages/warehouses/:uuid is called with the current name', () => {
      it('Then it returns 200 (same-name update skips the existence check)', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/api/storages/warehouses/${warehouseUUID}`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ name: 'PatchWarehouse Alpha Renamed' });

        expect(res.status).toBe(HttpStatus.OK);
        expect(res.body.uuid).toBe(warehouseUUID);
        expect(res.body.type).toBe('WAREHOUSE');
      });
    });
  });

  describe('Given an active warehouse and a request body with non-whitelisted icon and color fields', () => {
    describe('When PATCH /api/storages/warehouses/:uuid is called with icon and color', () => {
      it('Then it returns 400 because warehouse icon and color are fixed and not updatable by the client', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/api/storages/warehouses/${warehouseUUID}`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ icon: 'new-icon', color: '#334455' });

        expect(res.status).toBe(HttpStatus.BAD_REQUEST);
      });
    });
  });

  describe('Given a tenant with an archived custom room', () => {
    describe('When PATCH /api/storages/custom-rooms/:uuid is called on the archived storage', () => {
      it('Then it returns 200 — H-07 allows metadata edits in ARCHIVED (E5.2)', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/api/storages/custom-rooms/${archivedCustomRoomUUID}`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ name: 'Edited While Archived' });

        expect(res.status).toBe(HttpStatus.OK);
        expect(res.body.name).toBe('Edited While Archived');
        expect(res.body.status).toBe('ARCHIVED');
      });
    });
  });

  describe('Given an unauthenticated client', () => {
    describe('When PATCH /api/storages/warehouses/:uuid is called without a token', () => {
      it('Then it returns 401', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/api/storages/warehouses/${warehouseUUID}`)
          .send({ name: 'Hacked Name' });

        expect(res.status).toBe(HttpStatus.UNAUTHORIZED);
      });
    });
  });
});

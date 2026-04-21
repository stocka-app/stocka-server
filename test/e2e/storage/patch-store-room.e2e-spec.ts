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

async function archiveStoreRoom(app: INestApplication, token: string, uuid: string): Promise<void> {
  await request(app.getHttpServer())
    .delete(`/api/storages/store-rooms/${uuid}/archive`)
    .set('Authorization', `Bearer ${token}`);
}

// ─── Spec ─────────────────────────────────────────────────────────────────────

describe('PATCH /api/storages/store-rooms/:uuid (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  const TENANT_NAME = 'PatchStoreRoom E2E Business';
  const OWNER_EMAIL = 'patchstoreroom.owner@example.com';
  const OWNER_USERNAME = 'patchstoreroomowner';

  let ownerToken: string;
  let warehouseUUID: string;
  let storeRoomUUID: string;
  let archivedStoreRoomUUID: string;

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
      name: 'PatchStoreRoom Warehouse',
      address: 'Av. Industrial 100',
    });

    storeRoomUUID = await createStorage(app, ownerToken, {
      type: 'STORE_ROOM',
      name: 'PatchStoreRoom Store Room',
    });

    archivedStoreRoomUUID = await createStorage(app, ownerToken, {
      type: 'STORE_ROOM',
      name: 'PatchStoreRoom Archived Store Room',
    });
    await archiveStoreRoom(app, ownerToken, archivedStoreRoomUUID);
  });

  afterAll(async () => {
    await truncateStorageWorkerTables(dataSource);
  });

  describe('Given a non-existent store-room UUID', () => {
    describe('When PATCH /api/storages/store-rooms/:uuid is called', () => {
      it('Then it returns 404 (StorageNotFoundError)', async () => {
        const fakeUUID = '00000000-0000-0000-0000-000000000099';
        const res = await request(app.getHttpServer())
          .patch(`/api/storages/store-rooms/${fakeUUID}`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ name: 'Does Not Exist' });

        expect(res.status).toBe(HttpStatus.NOT_FOUND);
      });
    });
  });

  describe('Given the UUID belongs to a warehouse, not a store-room', () => {
    describe('When PATCH /api/storages/store-rooms/:warehouseUUID is called', () => {
      it('Then it returns 404 because the type does not match', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/api/storages/store-rooms/${warehouseUUID}`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ name: 'Type Mismatch' });

        expect(res.status).toBe(HttpStatus.NOT_FOUND);
      });
    });
  });

  describe('Given a tenant with an archived store-room', () => {
    describe('When PATCH /api/storages/store-rooms/:archivedUUID is called', () => {
      it('Then it returns 200 — H-07 allows metadata edits in ARCHIVED (E5.2)', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/api/storages/store-rooms/${archivedStoreRoomUUID}`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ name: 'Edited While Archived SR' });

        expect(res.status).toBe(HttpStatus.OK);
        expect(res.body.name).toBe('Edited While Archived SR');
        expect(res.body.status).toBe('ARCHIVED');
      });
    });
  });

  describe('Given a tenant with an active store-room', () => {
    describe('When PATCH /api/storages/store-rooms/:uuid is called with a new unique name', () => {
      it('Then it returns 200 with { storageUUID } and the name is updated', async () => {
        const patchRes = await request(app.getHttpServer())
          .patch(`/api/storages/store-rooms/${storeRoomUUID}`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ name: 'PatchStoreRoom Store Room Renamed' });

        expect(patchRes.status).toBe(HttpStatus.OK);
        expect(patchRes.body.uuid).toBe(storeRoomUUID);
        expect(patchRes.body.type).toBe('STORE_ROOM');

        const getRes = await request(app.getHttpServer())
          .get(`/api/storages/${storeRoomUUID}`)
          .set('Authorization', `Bearer ${ownerToken}`);

        expect(getRes.status).toBe(HttpStatus.OK);
        expect(getRes.body.name).toBe('PatchStoreRoom Store Room Renamed');
      });
    });
  });

  describe('Given an active store-room and the same name is sent', () => {
    describe('When PATCH is called with the current name (no change)', () => {
      it('Then it returns 200 (same-name update skips existence check)', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/api/storages/store-rooms/${storeRoomUUID}`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ name: 'PatchStoreRoom Store Room Renamed' });

        expect(res.status).toBe(HttpStatus.OK);
        expect(res.body.uuid).toBe(storeRoomUUID);
        expect(res.body.type).toBe('STORE_ROOM');
      });
    });
  });

  describe('Given two store-rooms and a rename attempt to an existing name', () => {
    describe('When PATCH is called with a name that belongs to another active storage', () => {
      it('Then it returns 409 (StorageNameAlreadyExistsError)', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/api/storages/store-rooms/${storeRoomUUID}`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ name: 'PatchStoreRoom Warehouse' });

        expect(res.status).toBe(HttpStatus.CONFLICT);
        expect(res.body.error).toBe('STORAGE_NAME_ALREADY_EXISTS');
      });
    });
  });

  describe('Given an active store-room and a request body with non-whitelisted icon and color fields', () => {
    describe('When PATCH is called with icon and color', () => {
      it('Then it returns 400 because store-room icon and color are fixed and not updatable by the client', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/api/storages/store-rooms/${storeRoomUUID}`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ icon: 'new-icon', color: '#112233' });

        expect(res.status).toBe(HttpStatus.BAD_REQUEST);
      });
    });
  });

  describe('Given a store-room with a non-null address', () => {
    describe('When PATCH is called with address: null', () => {
      it('Then the address is persisted as null and subsequent GET reflects it', async () => {
        const patchRes = await request(app.getHttpServer())
          .patch(`/api/storages/store-rooms/${storeRoomUUID}`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ address: null });
        expect(patchRes.status).toBe(HttpStatus.OK);
        expect(patchRes.body.address).toBeNull();

        const getRes = await request(app.getHttpServer())
          .get(`/api/storages/${storeRoomUUID}`)
          .set('Authorization', `Bearer ${ownerToken}`);
        expect(getRes.body.address).toBeNull();
      });
    });

    describe('When PATCH is called with address: ""', () => {
      it('Then the address is also nulled', async () => {
        // Restore an address first
        await request(app.getHttpServer())
          .patch(`/api/storages/store-rooms/${storeRoomUUID}`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ address: 'Temporary 123' });

        const patchRes = await request(app.getHttpServer())
          .patch(`/api/storages/store-rooms/${storeRoomUUID}`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ address: '' });
        expect(patchRes.status).toBe(HttpStatus.OK);
        expect(patchRes.body.address).toBeNull();
      });
    });
  });
});

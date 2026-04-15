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

describe('PATCH /api/storages/custom-rooms/:uuid (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  const TENANT_NAME = 'PatchCustomRoom E2E Business';
  const OWNER_EMAIL = 'patchcustomroom.owner@example.com';
  const OWNER_USERNAME = 'patchcustomroomowner';

  let ownerToken: string;
  let warehouseUUID: string;
  let customRoomUUID: string;
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
      name: 'PatchCustomRoom Warehouse',
      address: 'Av. Industrial 100',
    });

    customRoomUUID = await createStorage(app, ownerToken, {
      type: 'CUSTOM_ROOM',
      name: 'PatchCustomRoom Custom Room Active',
      roomType: 'Office',
    });

    archivedCustomRoomUUID = await createStorage(app, ownerToken, {
      type: 'CUSTOM_ROOM',
      name: 'PatchCustomRoom Archived Custom Room',
      roomType: 'Archive',
    });
    await archiveCustomRoom(app, ownerToken, archivedCustomRoomUUID);
  });

  afterAll(async () => {
    await truncateStorageWorkerTables(dataSource);
  });

  describe('Given a non-existent custom-room UUID', () => {
    describe('When PATCH /api/storages/custom-rooms/:uuid is called', () => {
      it('Then it returns 404 (StorageNotFoundError)', async () => {
        const fakeUUID = '00000000-0000-0000-0000-000000000098';
        const res = await request(app.getHttpServer())
          .patch(`/api/storages/custom-rooms/${fakeUUID}`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ name: 'Does Not Exist' });

        expect(res.status).toBe(HttpStatus.NOT_FOUND);
      });
    });
  });

  describe('Given the UUID belongs to a warehouse, not a custom-room', () => {
    describe('When PATCH /api/storages/custom-rooms/:warehouseUUID is called', () => {
      it('Then it returns 404 because the type does not match', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/api/storages/custom-rooms/${warehouseUUID}`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ name: 'Type Mismatch' });

        expect(res.status).toBe(HttpStatus.NOT_FOUND);
      });
    });
  });

  describe('Given a tenant with an archived custom room', () => {
    describe('When PATCH /api/storages/custom-rooms/:archivedUUID is called', () => {
      it('Then it returns 200 — H-07 allows metadata edits in ARCHIVED (E5.2)', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/api/storages/custom-rooms/${archivedCustomRoomUUID}`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ name: 'Edited While Archived CR' });

        expect(res.status).toBe(HttpStatus.OK);
        expect(res.body.name).toBe('Edited While Archived CR');
        expect(res.body.status).toBe('ARCHIVED');
      });
    });
  });

  describe('Given a tenant with an active custom room', () => {
    describe('When PATCH /api/storages/custom-rooms/:uuid is called with a new unique name', () => {
      it('Then it returns 200 with { storageUUID } and the name is updated', async () => {
        const patchRes = await request(app.getHttpServer())
          .patch(`/api/storages/custom-rooms/${customRoomUUID}`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ name: 'PatchCustomRoom Custom Room Renamed' });

        expect(patchRes.status).toBe(HttpStatus.OK);
        expect(patchRes.body.uuid).toBe(customRoomUUID);
        expect(patchRes.body.type).toBe('CUSTOM_ROOM');

        const getRes = await request(app.getHttpServer())
          .get(`/api/storages/${customRoomUUID}`)
          .set('Authorization', `Bearer ${ownerToken}`);

        expect(getRes.status).toBe(HttpStatus.OK);
        expect(getRes.body.name).toBe('PatchCustomRoom Custom Room Renamed');
      });
    });
  });

  describe('Given an active custom room and the same name is sent', () => {
    describe('When PATCH is called with the current name (no change)', () => {
      it('Then it returns 200 (same-name update skips existence check)', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/api/storages/custom-rooms/${customRoomUUID}`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ name: 'PatchCustomRoom Custom Room Renamed' });

        expect(res.status).toBe(HttpStatus.OK);
        expect(res.body.uuid).toBe(customRoomUUID);
        expect(res.body.type).toBe('CUSTOM_ROOM');
      });
    });
  });

  describe('Given two storages and a rename attempt to an existing name', () => {
    describe('When PATCH is called with a name that belongs to another active storage', () => {
      it('Then it returns 409 (StorageNameAlreadyExistsError)', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/api/storages/custom-rooms/${customRoomUUID}`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ name: 'PatchCustomRoom Warehouse' });

        expect(res.status).toBe(HttpStatus.CONFLICT);
        expect(res.body.error).toBe('STORAGE_NAME_ALREADY_EXISTS');
      });
    });
  });

  describe('Given an active custom room and no name in the update payload', () => {
    describe('When PATCH is called with only icon and color', () => {
      it('Then it returns 200 and the name remains unchanged', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/api/storages/custom-rooms/${customRoomUUID}`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ icon: 'updated-icon', color: '#556677', roomType: 'Meeting' });

        expect(res.status).toBe(HttpStatus.OK);
        expect(res.body.uuid).toBe(customRoomUUID);
        expect(res.body.type).toBe('CUSTOM_ROOM');
      });
    });
  });
});

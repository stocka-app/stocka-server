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

async function archiveStorage(app: INestApplication, token: string, uuid: string): Promise<void> {
  await request(app.getHttpServer())
    .delete(`/api/storages/${uuid}`)
    .set('Authorization', `Bearer ${token}`);
}

// ─── Spec ─────────────────────────────────────────────────────────────────────

describe('PATCH /api/storages/:uuid/type (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  const TENANT_NAME = 'ChangeType E2E Business';
  const OWNER_EMAIL = 'changetype.owner@example.com';
  const OWNER_USERNAME = 'changetypeowner';

  let ownerToken: string;
  let customRoomUUID: string;
  let storeRoomUUID: string;
  let archivedRoomUUID: string;

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

    customRoomUUID = await createStorage(app, ownerToken, {
      type: 'CUSTOM_ROOM',
      name: 'ChangeType Custom Room',
      roomType: 'Office',
      address: 'Av. Reforma 100',
    });

    storeRoomUUID = await createStorage(app, ownerToken, {
      type: 'STORE_ROOM',
      name: 'ChangeType Store Room',
      address: 'Calle 5 de Mayo 200',
    });

    archivedRoomUUID = await createStorage(app, ownerToken, {
      type: 'CUSTOM_ROOM',
      name: 'ChangeType Archived Room',
      roomType: 'Archive',
      address: 'Av. Juarez 300',
    });
    await archiveStorage(app, ownerToken, archivedRoomUUID);
  });

  afterAll(async () => {
    await truncateStorageWorkerTables(dataSource);
  });

  // ── Happy path ──────────────────────────────────────────────────────────────

  describe('Given an active custom room with a valid address', () => {
    describe('When type is changed to STORE_ROOM', () => {
      it('Then it returns 200 with { storageUUID }', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/api/storages/${customRoomUUID}/type`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ type: 'STORE_ROOM' });

        expect(res.status).toBe(HttpStatus.OK);
        expect(res.body).toEqual({ storageUUID: customRoomUUID });
      });
    });
  });

  describe('Given the storage was just changed to STORE_ROOM', () => {
    describe('When type is changed to WAREHOUSE', () => {
      it('Then it returns 200 (address was preserved from previous type)', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/api/storages/${customRoomUUID}/type`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ type: 'WAREHOUSE' });

        expect(res.status).toBe(HttpStatus.OK);
        expect(res.body).toEqual({ storageUUID: customRoomUUID });
      });
    });
  });

  // ── Same type no-op ─────────────────────────────────────────────────────────

  describe('Given an active store room', () => {
    describe('When type is changed to the same type (STORE_ROOM)', () => {
      it('Then it returns 200 without any mutation', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/api/storages/${storeRoomUUID}/type`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ type: 'STORE_ROOM' });

        expect(res.status).toBe(HttpStatus.OK);
        expect(res.body).toEqual({ storageUUID: storeRoomUUID });
      });
    });
  });

  // ── Archived block ──────────────────────────────────────────────────────────

  describe('Given an archived storage', () => {
    describe('When type change is attempted', () => {
      it('Then it returns 409 (STORAGE_ARCHIVED_CANNOT_BE_UPDATED)', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/api/storages/${archivedRoomUUID}/type`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ type: 'WAREHOUSE' });

        expect(res.status).toBe(HttpStatus.CONFLICT);
        expect(res.body.error).toBe('STORAGE_ARCHIVED_CANNOT_BE_UPDATED');
      });
    });
  });

  // ── Not found ───────────────────────────────────────────────────────────────

  describe('Given a non-existent storage UUID', () => {
    describe('When type change is attempted', () => {
      it('Then it returns 404 (STORAGE_NOT_FOUND)', async () => {
        const fakeUUID = '00000000-0000-0000-0000-000000000000';
        const res = await request(app.getHttpServer())
          .patch(`/api/storages/${fakeUUID}/type`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ type: 'WAREHOUSE' });

        expect(res.status).toBe(HttpStatus.NOT_FOUND);
      });
    });
  });

  // ── Unauthenticated ─────────────────────────────────────────────────────────

  describe('Given no authentication token', () => {
    describe('When type change is attempted', () => {
      it('Then it returns 401', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/api/storages/${storeRoomUUID}/type`)
          .send({ type: 'WAREHOUSE' });

        expect(res.status).toBe(HttpStatus.UNAUTHORIZED);
      });
    });
  });

  // ── Invalid body ────────────────────────────────────────────────────────────

  describe('Given an invalid type value', () => {
    describe('When type change is sent with a non-enum value', () => {
      it('Then it returns 400', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/api/storages/${storeRoomUUID}/type`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ type: 'INVALID_TYPE' });

        expect(res.status).toBe(HttpStatus.BAD_REQUEST);
      });
    });
  });
});

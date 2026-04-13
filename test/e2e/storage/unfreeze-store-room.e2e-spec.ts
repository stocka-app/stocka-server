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

async function createStoreRoom(
  app: INestApplication,
  token: string,
  name: string,
): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/api/storages/store-rooms')
    .set('Authorization', `Bearer ${token}`)
    .send({ name, address: '100 Test St' });
  return (res.body as CreateStorageResponse).storageUUID;
}

async function freezeStoreRoom(
  app: INestApplication,
  token: string,
  uuid: string,
): Promise<void> {
  await request(app.getHttpServer())
    .post(`/api/storages/store-rooms/${uuid}/freeze`)
    .set('Authorization', `Bearer ${token}`);
}

// ─── Spec ─────────────────────────────────────────────────────────────────────

describe('POST /api/storages/store-rooms/:uuid/unfreeze (E2E)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  const TENANT_NAME = 'UnfreezeStoreRoom E2E Business';
  const OWNER_EMAIL = 'unfreeze.storeroom.owner@example.com';
  const OWNER_USERNAME = 'unfreezestoreroomowner';

  let ownerToken: string;
  let frozenStoreRoomUUID: string;
  let activeStoreRoomUUID: string;

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

    // Frozen store room — used for U-SR-1 and U-SR-3
    frozenStoreRoomUUID = await createStoreRoom(app, ownerToken, 'UnfreezeStoreRoom Frozen Alpha');
    await freezeStoreRoom(app, ownerToken, frozenStoreRoomUUID);

    // Active store room (never frozen) — used for U-SR-2
    activeStoreRoomUUID = await createStoreRoom(app, ownerToken, 'UnfreezeStoreRoom Active Beta');
  });

  afterAll(async () => {
    await truncateStorageWorkerTables(dataSource);
  });

  // ── U-SR-1 ──────────────────────────────────────────────────────────────────

  describe('Given an owner with a frozen store room', () => {
    describe('When POST /api/storages/store-rooms/:uuid/unfreeze is called', () => {
      it('Then it returns 200 and the store room transitions back to ACTIVE status', async () => {
        const res = await request(app.getHttpServer())
          .post(`/api/storages/store-rooms/${frozenStoreRoomUUID}/unfreeze`)
          .set('Authorization', `Bearer ${ownerToken}`);

        expect(res.status).toBe(HttpStatus.OK);

        const getRes = await request(app.getHttpServer())
          .get(`/api/storages/${frozenStoreRoomUUID}`)
          .set('Authorization', `Bearer ${ownerToken}`);

        expect(getRes.status).toBe(HttpStatus.OK);
        expect(getRes.body.status).toBe('ACTIVE');
        expect(getRes.body.frozenAt).toBeNull();
      });
    });
  });

  // ── U-SR-2 ──────────────────────────────────────────────────────────────────

  describe('Given a store room that is currently active (not frozen)', () => {
    describe('When POST /api/storages/store-rooms/:uuid/unfreeze is called', () => {
      it('Then it returns 409 STORAGE_NOT_FROZEN', async () => {
        const res = await request(app.getHttpServer())
          .post(`/api/storages/store-rooms/${activeStoreRoomUUID}/unfreeze`)
          .set('Authorization', `Bearer ${ownerToken}`);

        expect(res.status).toBe(HttpStatus.CONFLICT);
        expect(res.body.error).toBe('STORAGE_NOT_FROZEN');
      });
    });
  });

  // ── U-SR-3 ──────────────────────────────────────────────────────────────────

  describe('Given an unauthenticated client', () => {
    describe('When POST /api/storages/store-rooms/:uuid/unfreeze is called without a token', () => {
      it('Then it returns 401', async () => {
        const res = await request(app.getHttpServer()).post(
          `/api/storages/store-rooms/${frozenStoreRoomUUID}/unfreeze`,
        );

        expect(res.status).toBe(HttpStatus.UNAUTHORIZED);
      });
    });
  });
});

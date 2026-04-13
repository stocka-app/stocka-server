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

async function createCustomRoom(
  app: INestApplication,
  token: string,
  name: string,
): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/api/storages/custom-rooms')
    .set('Authorization', `Bearer ${token}`)
    .send({ name, roomType: 'Storage', address: '100 Test St' });
  return (res.body as CreateStorageResponse).storageUUID;
}

// ─── Spec ─────────────────────────────────────────────────────────────────────

describe('POST /api/storages/custom-rooms/:uuid/freeze (E2E)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  const TENANT_NAME = 'FreezeCustomRoom E2E Business';
  const OWNER_EMAIL = 'freeze.customroom.owner@example.com';
  const OWNER_USERNAME = 'freezecustomroomowner';

  let ownerToken: string;
  let customRoomUUID: string;

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

    customRoomUUID = await createCustomRoom(app, ownerToken, 'FreezeCustomRoom Gamma');
  });

  afterAll(async () => {
    await truncateStorageWorkerTables(dataSource);
  });

  // ── F-CR-1 ──────────────────────────────────────────────────────────────────

  describe('Given an owner with an active custom room', () => {
    describe('When POST /api/storages/custom-rooms/:uuid/freeze is called', () => {
      it('Then it returns 200 and the custom room transitions to FROZEN status', async () => {
        const res = await request(app.getHttpServer())
          .post(`/api/storages/custom-rooms/${customRoomUUID}/freeze`)
          .set('Authorization', `Bearer ${ownerToken}`);

        expect(res.status).toBe(HttpStatus.OK);

        const getRes = await request(app.getHttpServer())
          .get(`/api/storages/${customRoomUUID}`)
          .set('Authorization', `Bearer ${ownerToken}`);

        expect(getRes.status).toBe(HttpStatus.OK);
        expect(getRes.body.status).toBe('FROZEN');
        expect(getRes.body.frozenAt).not.toBeNull();
      });
    });
  });

  // ── F-CR-2 ──────────────────────────────────────────────────────────────────

  describe('Given a custom room that is already frozen', () => {
    describe('When POST /api/storages/custom-rooms/:uuid/freeze is called again', () => {
      it('Then it returns 409 STORAGE_ALREADY_FROZEN', async () => {
        const res = await request(app.getHttpServer())
          .post(`/api/storages/custom-rooms/${customRoomUUID}/freeze`)
          .set('Authorization', `Bearer ${ownerToken}`);

        expect(res.status).toBe(HttpStatus.CONFLICT);
        expect(res.body.error).toBe('STORAGE_ALREADY_FROZEN');
      });
    });
  });

  // ── F-CR-3 ──────────────────────────────────────────────────────────────────

  describe('Given an unauthenticated client', () => {
    describe('When POST /api/storages/custom-rooms/:uuid/freeze is called without a token', () => {
      it('Then it returns 401', async () => {
        const res = await request(app.getHttpServer()).post(
          `/api/storages/custom-rooms/${customRoomUUID}/freeze`,
        );

        expect(res.status).toBe(HttpStatus.UNAUTHORIZED);
      });
    });
  });
});

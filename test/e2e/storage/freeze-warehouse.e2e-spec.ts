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

async function createWarehouse(
  app: INestApplication,
  token: string,
  name: string,
  address: string,
): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/api/storages/warehouses')
    .set('Authorization', `Bearer ${token}`)
    .send({ name, address });
  return (res.body as CreateStorageResponse).storageUUID;
}

// ─── Spec ─────────────────────────────────────────────────────────────────────

describe('POST /api/storages/warehouses/:uuid/freeze (E2E)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  const TENANT_NAME = 'FreezeWarehouse E2E Business';
  const OWNER_EMAIL = 'freeze.warehouse.owner@example.com';
  const OWNER_USERNAME = 'freezewarehouseowner';

  let ownerToken: string;
  let warehouseUUID: string;

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

    warehouseUUID = await createWarehouse(
      app,
      ownerToken,
      'FreezeWarehouse Alpha',
      'Av. Industrial 500, CDMX',
    );
  });

  afterAll(async () => {
    await truncateStorageWorkerTables(dataSource);
  });

  // ── F-WH-1 ──────────────────────────────────────────────────────────────────

  describe('Given an owner with an active warehouse', () => {
    describe('When POST /api/storages/warehouses/:uuid/freeze is called', () => {
      it('Then it returns 200 and the warehouse transitions to FROZEN status', async () => {
        const res = await request(app.getHttpServer())
          .post(`/api/storages/warehouses/${warehouseUUID}/freeze`)
          .set('Authorization', `Bearer ${ownerToken}`);

        expect(res.status).toBe(HttpStatus.OK);

        const getRes = await request(app.getHttpServer())
          .get(`/api/storages/${warehouseUUID}`)
          .set('Authorization', `Bearer ${ownerToken}`);

        expect(getRes.status).toBe(HttpStatus.OK);
        expect(getRes.body.status).toBe('FROZEN');
        expect(getRes.body.frozenAt).not.toBeNull();
      });
    });
  });

  // ── F-WH-2 ──────────────────────────────────────────────────────────────────

  describe('Given a warehouse that is already frozen', () => {
    describe('When POST /api/storages/warehouses/:uuid/freeze is called again', () => {
      it('Then it returns 409 STORAGE_ALREADY_FROZEN', async () => {
        const res = await request(app.getHttpServer())
          .post(`/api/storages/warehouses/${warehouseUUID}/freeze`)
          .set('Authorization', `Bearer ${ownerToken}`);

        expect(res.status).toBe(HttpStatus.CONFLICT);
        expect(res.body.error).toBe('STORAGE_ALREADY_FROZEN');
      });
    });
  });

  // ── F-WH-3 ──────────────────────────────────────────────────────────────────

  describe('Given an unauthenticated client', () => {
    describe('When POST /api/storages/warehouses/:uuid/freeze is called without a token', () => {
      it('Then it returns 401', async () => {
        const res = await request(app.getHttpServer()).post(
          `/api/storages/warehouses/${warehouseUUID}/freeze`,
        );

        expect(res.status).toBe(HttpStatus.UNAUTHORIZED);
      });
    });
  });

  // ── F-WH-4 ──────────────────────────────────────────────────────────────────

  describe('Given a non-existent warehouse UUID', () => {
    describe('When POST /api/storages/warehouses/:uuid/freeze is called', () => {
      it('Then it returns 404 STORAGE_NOT_FOUND', async () => {
        const fakeUUID = '00000000-0000-0000-0000-000000000000';
        const res = await request(app.getHttpServer())
          .post(`/api/storages/warehouses/${fakeUUID}/freeze`)
          .set('Authorization', `Bearer ${ownerToken}`);

        expect(res.status).toBe(HttpStatus.NOT_FOUND);
      });
    });
  });

  // ── F-WH-5 ──────────────────────────────────────────────────────────────────

  describe('Given a warehouse that has been frozen', () => {
    describe('When GET /api/storages is called with status filter FROZEN', () => {
      it('Then the frozen warehouse appears in the list with FROZEN status', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/storages?status=FROZEN')
          .set('Authorization', `Bearer ${ownerToken}`);

        expect(res.status).toBe(HttpStatus.OK);

        const items: Array<{ uuid: string; status: string }> = res.body.items ?? [];
        const frozen = items.find((s) => s.uuid === warehouseUUID);

        expect(frozen).toBeDefined();
        expect(frozen?.status).toBe('FROZEN');
      });
    });
  });
});

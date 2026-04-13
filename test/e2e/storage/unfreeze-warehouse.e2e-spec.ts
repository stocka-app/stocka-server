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

async function freezeWarehouse(app: INestApplication, token: string, uuid: string): Promise<void> {
  await request(app.getHttpServer())
    .post(`/api/storages/warehouses/${uuid}/freeze`)
    .set('Authorization', `Bearer ${token}`);
}

// ─── Spec ─────────────────────────────────────────────────────────────────────

describe('POST /api/storages/warehouses/:uuid/unfreeze (E2E)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  const TENANT_NAME = 'UnfreezeWarehouse E2E Business';
  const OWNER_EMAIL = 'unfreeze.warehouse.owner@example.com';
  const OWNER_USERNAME = 'unfreezewarehouseowner';

  let ownerToken: string;
  let frozenWarehouseUUID: string;
  let activeWarehouseUUID: string;
  let roundtripWarehouseUUID: string;

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

    // Frozen warehouse — used for U-WH-1 and U-WH-3
    frozenWarehouseUUID = await createWarehouse(
      app,
      ownerToken,
      'UnfreezeWarehouse Frozen Alpha',
      'Av. Reforma 800, CDMX',
    );
    await freezeWarehouse(app, ownerToken, frozenWarehouseUUID);

    // Active warehouse (never frozen) — used for U-WH-2
    activeWarehouseUUID = await createWarehouse(
      app,
      ownerToken,
      'UnfreezeWarehouse Active Beta',
      'Calle Insurgentes 300, CDMX',
    );

    // Warehouse for freeze-then-unfreeze roundtrip — used for U-WH-5
    roundtripWarehouseUUID = await createWarehouse(
      app,
      ownerToken,
      'UnfreezeWarehouse Roundtrip Gamma',
      'Blvd. Tlalpan 100, CDMX',
    );
  });

  afterAll(async () => {
    await truncateStorageWorkerTables(dataSource);
  });

  // ── U-WH-1 ──────────────────────────────────────────────────────────────────

  describe('Given an owner with a frozen warehouse', () => {
    describe('When POST /api/storages/warehouses/:uuid/unfreeze is called', () => {
      it('Then it returns 200 with the reactivated storage DTO', async () => {
        const res = await request(app.getHttpServer())
          .post(`/api/storages/warehouses/${frozenWarehouseUUID}/unfreeze`)
          .set('Authorization', `Bearer ${ownerToken}`);

        expect(res.status).toBe(HttpStatus.OK);
        expect(res.body.uuid).toBe(frozenWarehouseUUID);
        expect(res.body.status).toBe('ACTIVE');
        expect(res.body.frozenAt).toBeNull();
      });
    });
  });

  // ── U-WH-2 ──────────────────────────────────────────────────────────────────

  describe('Given a warehouse that is currently active (not frozen)', () => {
    describe('When POST /api/storages/warehouses/:uuid/unfreeze is called', () => {
      it('Then it returns 409 STORAGE_NOT_FROZEN', async () => {
        const res = await request(app.getHttpServer())
          .post(`/api/storages/warehouses/${activeWarehouseUUID}/unfreeze`)
          .set('Authorization', `Bearer ${ownerToken}`);

        expect(res.status).toBe(HttpStatus.CONFLICT);
        expect(res.body.error).toBe('STORAGE_NOT_FROZEN');
      });
    });
  });

  // ── U-WH-3 ──────────────────────────────────────────────────────────────────

  describe('Given an unauthenticated client', () => {
    describe('When POST /api/storages/warehouses/:uuid/unfreeze is called without a token', () => {
      it('Then it returns 401', async () => {
        const res = await request(app.getHttpServer()).post(
          `/api/storages/warehouses/${frozenWarehouseUUID}/unfreeze`,
        );

        expect(res.status).toBe(HttpStatus.UNAUTHORIZED);
      });
    });
  });

  // ── U-WH-4 ──────────────────────────────────────────────────────────────────

  describe('Given a non-existent warehouse UUID', () => {
    describe('When POST /api/storages/warehouses/:uuid/unfreeze is called', () => {
      it('Then it returns 404 STORAGE_NOT_FOUND', async () => {
        const fakeUUID = '00000000-0000-0000-0000-000000000000';
        const res = await request(app.getHttpServer())
          .post(`/api/storages/warehouses/${fakeUUID}/unfreeze`)
          .set('Authorization', `Bearer ${ownerToken}`);

        expect(res.status).toBe(HttpStatus.NOT_FOUND);
      });
    });
  });

  // ── U-WH-5 ──────────────────────────────────────────────────────────────────

  describe('Given an owner with an active warehouse', () => {
    describe('When the warehouse is frozen and then unfrozen', () => {
      it('Then both operations return 200 and the warehouse is back to ACTIVE', async () => {
        const freezeRes = await request(app.getHttpServer())
          .post(`/api/storages/warehouses/${roundtripWarehouseUUID}/freeze`)
          .set('Authorization', `Bearer ${ownerToken}`);

        expect(freezeRes.status).toBe(HttpStatus.OK);

        const unfreezeRes = await request(app.getHttpServer())
          .post(`/api/storages/warehouses/${roundtripWarehouseUUID}/unfreeze`)
          .set('Authorization', `Bearer ${ownerToken}`);

        expect(unfreezeRes.status).toBe(HttpStatus.OK);

        const getRes = await request(app.getHttpServer())
          .get(`/api/storages/${roundtripWarehouseUUID}`)
          .set('Authorization', `Bearer ${ownerToken}`);

        expect(getRes.status).toBe(HttpStatus.OK);
        expect(getRes.body.status).toBe('ACTIVE');
        expect(getRes.body.frozenAt).toBeNull();
      });
    });
  });
});

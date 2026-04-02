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

describe('GET /api/storages/:uuid (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  const TENANT_A_NAME = 'GetStorage E2E Business Alpha';
  const TENANT_B_NAME = 'GetStorage E2E Business Beta';
  const OWNER_A_EMAIL = 'getstorage.owner.a@example.com';
  const OWNER_A_USERNAME = 'getstorageownera';
  const OWNER_B_EMAIL = 'getstorage.owner.b@example.com';
  const OWNER_B_USERNAME = 'getstorageownerb';

  let ownerAToken: string;
  let ownerBToken: string;
  let warehouseUUID: string;
  let tenantBStorageUUID: string;

  beforeAll(async () => {
    const workerApp = await getStorageWorkerApp();
    app = workerApp.app;
    dataSource = workerApp.dataSource;
    await truncateStorageWorkerTables(dataSource);

    await signUp(app, dataSource, OWNER_A_EMAIL, OWNER_A_USERNAME);
    const tempTokenA = await signIn(app, OWNER_A_EMAIL);
    await completeOnboarding(app, tempTokenA, TENANT_A_NAME);
    ownerAToken = await signIn(app, OWNER_A_EMAIL);
    await setTenantToStarter(dataSource, TENANT_A_NAME);
    ownerAToken = await signIn(app, OWNER_A_EMAIL);

    warehouseUUID = await createStorage(app, ownerAToken, {
      type: 'WAREHOUSE',
      name: 'GetStorage Warehouse Alpha',
      address: 'Av. Industrial 200, CDMX',
    });

    await signUp(app, dataSource, OWNER_B_EMAIL, OWNER_B_USERNAME);
    const tempTokenB = await signIn(app, OWNER_B_EMAIL);
    await completeOnboarding(app, tempTokenB, TENANT_B_NAME);
    ownerBToken = await signIn(app, OWNER_B_EMAIL);
    await setTenantToStarter(dataSource, TENANT_B_NAME);
    ownerBToken = await signIn(app, OWNER_B_EMAIL);

    tenantBStorageUUID = await createStorage(app, ownerBToken, {
      type: 'STORE_ROOM',
      name: 'GetStorage Tenant B Storage',
    });
  });

  afterAll(async () => {
    await truncateStorageWorkerTables(dataSource);
  });

  describe('Given a tenant with an active warehouse', () => {
    describe('When GET /api/storages/:uuid is called with a valid UUID', () => {
      it('Then it returns 200 with the full StorageOutDto', async () => {
        const res = await request(app.getHttpServer())
          .get(`/api/storages/${warehouseUUID}`)
          .set('Authorization', `Bearer ${ownerAToken}`);

        expect(res.status).toBe(HttpStatus.OK);
        expect(res.body).toMatchObject({
          uuid: warehouseUUID,
          name: 'GetStorage Warehouse Alpha',
          type: 'WAREHOUSE',
          status: 'ACTIVE',
          description: null,
          address: 'Av. Industrial 200, CDMX',
          roomType: null,
          archivedAt: null,
        });
        expect(res.body.createdAt).toBeDefined();
        expect(res.body.updatedAt).toBeDefined();
      });
    });
  });

  describe('Given a tenant with storages', () => {
    describe('When GET /api/storages/:uuid is called with a non-existent UUID', () => {
      it('Then it returns 404', async () => {
        const fakeUUID = '00000000-0000-0000-0000-000000000000';
        const res = await request(app.getHttpServer())
          .get(`/api/storages/${fakeUUID}`)
          .set('Authorization', `Bearer ${ownerAToken}`);

        expect(res.status).toBe(HttpStatus.NOT_FOUND);
      });
    });
  });

  describe('Given two tenants each with their own storages', () => {
    describe('When tenant A tries GET /api/storages/:tenantBStorageUUID', () => {
      it('Then it returns 404 (tenant isolation)', async () => {
        const res = await request(app.getHttpServer())
          .get(`/api/storages/${tenantBStorageUUID}`)
          .set('Authorization', `Bearer ${ownerAToken}`);

        expect(res.status).toBe(HttpStatus.NOT_FOUND);
      });
    });
  });

  describe('Given an unauthenticated client', () => {
    describe('When GET /api/storages/:uuid is called without a token', () => {
      it('Then it returns 401', async () => {
        const res = await request(app.getHttpServer()).get(`/api/storages/${warehouseUUID}`);

        expect(res.status).toBe(HttpStatus.UNAUTHORIZED);
      });
    });
  });
});

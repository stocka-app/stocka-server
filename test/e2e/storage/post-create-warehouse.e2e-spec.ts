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
    .post('/api/onboarding/start')
    .set('Authorization', `Bearer ${token}`);

  await request(app.getHttpServer())
    .patch('/api/onboarding/progress')
    .set('Authorization', `Bearer ${token}`)
    .send({ section: 'preferences', data: { locale: 'es', currency: 'MXN' } });

  await request(app.getHttpServer())
    .patch('/api/onboarding/progress')
    .set('Authorization', `Bearer ${token}`)
    .send({ section: 'path', data: { path: 'CREATE' } });

  await request(app.getHttpServer())
    .patch('/api/onboarding/progress')
    .set('Authorization', `Bearer ${token}`)
    .send({
      section: 'businessProfile',
      data: {
        name: tenantName,
        businessType: 'retail',
        country: 'MX',
        timezone: 'America/Mexico_City',
      },
    });

  await request(app.getHttpServer())
    .post('/api/onboarding/complete')
    .set('Authorization', `Bearer ${token}`);
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

async function setTenantToStarterWithZeroWarehouses(
  dataSource: DataSource,
  tenantName: string,
): Promise<void> {
  await dataSource.query(
    `UPDATE "tenants"."tenant_config" tc
     SET tier = 'STARTER',
         max_warehouses = 0,
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
  address: string = '100 Test St',
): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/api/storages/warehouses')
    .set('Authorization', `Bearer ${token}`)
    .send({ name, address });
  return (res.body as CreateStorageResponse).storageUUID;
}

// ─── Spec ─────────────────────────────────────────────────────────────────────

describe('POST /api/storages/warehouses (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const workerApp = await getStorageWorkerApp();
    app = workerApp.app;
    dataSource = workerApp.dataSource;
    await truncateStorageWorkerTables(dataSource);
  });

  afterAll(async () => {
    await truncateStorageWorkerTables(dataSource);
  });

  describe('Given a tenant on FREE tier', () => {
    let freeOwnerToken: string;

    beforeAll(async () => {
      const FREE_EMAIL = 'postcreatewarehouse.free@example.com';
      const FREE_USERNAME = 'postcreatewarehousefree';
      await signUp(app, dataSource, FREE_EMAIL, FREE_USERNAME);
      const tempToken = await signIn(app, FREE_EMAIL);
      await completeOnboarding(app, tempToken, 'PostCreateWarehouse Free Tier Biz');
      freeOwnerToken = await signIn(app, FREE_EMAIL);
      // Does not upgrade — stays on FREE
    });

    describe('When POST /api/storages/warehouses is called', () => {
      it('Then it returns 403 because the FREE tier snapshot has max_warehouses = 0', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/storages/warehouses')
          .set('Authorization', `Bearer ${freeOwnerToken}`)
          .send({ name: 'Free Warehouse', address: 'Some Addr' });

        expect(res.status).toBe(HttpStatus.FORBIDDEN);
      });
    });
  });

  describe('Given a STARTER tenant with per-tenant max_warehouses forced to 0', () => {
    let zeroWarehouseToken: string;

    beforeAll(async () => {
      const EMAIL = 'postcreatewarehouse.zero@example.com';
      const USERNAME = 'postcreatewarehousezero';
      await signUp(app, dataSource, EMAIL, USERNAME);
      const tempToken = await signIn(app, EMAIL);
      await completeOnboarding(app, tempToken, 'PostCreateWarehouse Zero Warehouses Biz');
      // Upgrade to STARTER but override max_warehouses to 0 (per-tenant restriction)
      await setTenantToStarterWithZeroWarehouses(
        dataSource,
        'PostCreateWarehouse Zero Warehouses Biz',
      );
      zeroWarehouseToken = await signIn(app, EMAIL);
    });

    describe('When POST /api/storages/warehouses is called', () => {
      it('Then it returns 403 WAREHOUSE_REQUIRES_TIER_UPGRADE from the handler (SecurityGuard passes, handler capability check fails)', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/storages/warehouses')
          .set('Authorization', `Bearer ${zeroWarehouseToken}`)
          .send({ name: 'Zero Limit Warehouse', address: 'Some St' });

        expect(res.status).toBe(HttpStatus.FORBIDDEN);
        expect(res.body.error).toBe('WAREHOUSE_REQUIRES_TIER_UPGRADE');
      });
    });
  });

  describe('Given a tenant on STARTER tier with max_warehouses=3 and 3 existing warehouses', () => {
    let starterToken: string;

    beforeAll(async () => {
      const STARTER_EMAIL = 'postcreatewarehouse.starter@example.com';
      const STARTER_USERNAME = 'postcreatewarehousestarter';
      await signUp(app, dataSource, STARTER_EMAIL, STARTER_USERNAME);
      const tempToken = await signIn(app, STARTER_EMAIL);
      await completeOnboarding(app, tempToken, 'PostCreateWarehouse Starter Limit Biz');
      starterToken = await signIn(app, STARTER_EMAIL);
      await setTenantToStarter(dataSource, 'PostCreateWarehouse Starter Limit Biz');
      starterToken = await signIn(app, STARTER_EMAIL);

      // Fill up to 3 warehouses (the STARTER limit)
      await createWarehouse(app, starterToken, 'Warehouse Limit 1', 'Addr 1');
      await createWarehouse(app, starterToken, 'Warehouse Limit 2', 'Addr 2');
      await createWarehouse(app, starterToken, 'Warehouse Limit 3', 'Addr 3');
    });

    describe('When POST /api/storages/warehouses is called to create a 4th WAREHOUSE', () => {
      it('Then it returns 403 (WarehouseRequiresTierUpgradeError)', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/storages/warehouses')
          .set('Authorization', `Bearer ${starterToken}`)
          .send({ name: 'Warehouse Over Limit', address: 'Addr 4' });

        expect(res.status).toBe(HttpStatus.FORBIDDEN);
      });
    });
  });

  describe('Given a tenant with an existing warehouse', () => {
    let ownerBToken: string;

    beforeAll(async () => {
      const OWNER_B_EMAIL = 'postcreatewarehouse.dupname@example.com';
      const OWNER_B_USERNAME = 'postcreatewarehousedupname';
      await signUp(app, dataSource, OWNER_B_EMAIL, OWNER_B_USERNAME);
      const tempTokenB = await signIn(app, OWNER_B_EMAIL);
      await completeOnboarding(app, tempTokenB, 'PostCreateWarehouse DupName Biz');
      ownerBToken = await signIn(app, OWNER_B_EMAIL);
      await setTenantToStarter(dataSource, 'PostCreateWarehouse DupName Biz');
      ownerBToken = await signIn(app, OWNER_B_EMAIL);

      await createWarehouse(app, ownerBToken, 'PostCreateWarehouse Existing Warehouse', 'Addr 1');
    });

    describe('When POST /api/storages/warehouses is called with a name that already exists', () => {
      it('Then it returns 409 (StorageNameAlreadyExistsError)', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/storages/warehouses')
          .set('Authorization', `Bearer ${ownerBToken}`)
          .send({
            name: 'PostCreateWarehouse Existing Warehouse',
            address: '100 St',
          });

        expect(res.status).toBe(HttpStatus.CONFLICT);
        expect(res.body.error).toBe('STORAGE_NAME_ALREADY_EXISTS');
      });
    });
  });

  describe('Given a STARTER tenant with available warehouse capacity', () => {
    let ownerToken: string;

    beforeAll(async () => {
      const EMAIL = 'postcreatewarehouse.happy@example.com';
      const USERNAME = 'postcreatewarehousehappy';
      await signUp(app, dataSource, EMAIL, USERNAME);
      const tempToken = await signIn(app, EMAIL);
      await completeOnboarding(app, tempToken, 'PostCreateWarehouse Happy Path Biz');
      ownerToken = await signIn(app, EMAIL);
      await setTenantToStarter(dataSource, 'PostCreateWarehouse Happy Path Biz');
      ownerToken = await signIn(app, EMAIL);
    });

    describe('When POST /api/storages/warehouses is called with valid data', () => {
      it('Then it returns 201 and a storageUUID', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/storages/warehouses')
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ name: 'Happy Path Warehouse', address: '123 Main St' });

        expect(res.status).toBe(HttpStatus.CREATED);
        expect(res.body.storageUUID).toBeDefined();
      });
    });
  });
});

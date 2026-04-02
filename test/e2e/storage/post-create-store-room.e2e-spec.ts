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

// ─── Spec ─────────────────────────────────────────────────────────────────────

describe('POST /api/storages/store-rooms (e2e)', () => {
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

  describe('Given a tenant on STARTER with max_store_rooms=3 and 3 store rooms', () => {
    let starterToken: string;

    beforeAll(async () => {
      const EMAIL = 'postcreatestoreroom.starter@example.com';
      const USERNAME = 'postcreatestoreroomstarter';
      await signUp(app, dataSource, EMAIL, USERNAME);
      const tempToken = await signIn(app, EMAIL);
      await completeOnboarding(app, tempToken, 'PostCreateStoreRoom Starter Limit Biz');
      starterToken = await signIn(app, EMAIL);
      await setTenantToStarter(dataSource, 'PostCreateStoreRoom Starter Limit Biz');
      starterToken = await signIn(app, EMAIL);

      // Fill up to 3 store rooms (the STARTER limit)
      await createStoreRoom(app, starterToken, 'Store Room Limit 1');
      await createStoreRoom(app, starterToken, 'Store Room Limit 2');
      await createStoreRoom(app, starterToken, 'Store Room Limit 3');
    });

    describe('When POST /api/storages/store-rooms is called to exceed the limit', () => {
      it('Then it returns 403 (StoreRoomLimitReachedError)', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/storages/store-rooms')
          .set('Authorization', `Bearer ${starterToken}`)
          .send({ name: 'Store Room Over Limit', address: '100 St' });

        expect(res.status).toBe(HttpStatus.FORBIDDEN);
      });
    });
  });

  describe('Given a tenant with existing storages', () => {
    let ownerToken: string;

    beforeAll(async () => {
      const EMAIL = 'postcreatestoreroom.dupname@example.com';
      const USERNAME = 'postcreatestoreroommodupname';
      await signUp(app, dataSource, EMAIL, USERNAME);
      const tempToken = await signIn(app, EMAIL);
      await completeOnboarding(app, tempToken, 'PostCreateStoreRoom DupName Biz');
      ownerToken = await signIn(app, EMAIL);
      await setTenantToStarter(dataSource, 'PostCreateStoreRoom DupName Biz');
      ownerToken = await signIn(app, EMAIL);

      await createStoreRoom(app, ownerToken, 'PostCreateStoreRoom Existing Storage');
    });

    describe('When POST /api/storages/store-rooms is called with a name that already exists', () => {
      it('Then it returns 409 (StorageNameAlreadyExistsError)', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/storages/store-rooms')
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({
            name: 'PostCreateStoreRoom Existing Storage',
            address: '100 St',
          });

        expect(res.status).toBe(HttpStatus.CONFLICT);
        expect(res.body.error).toBe('STORAGE_NAME_ALREADY_EXISTS');
      });
    });
  });
});

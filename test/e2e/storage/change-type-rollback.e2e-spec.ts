import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { getStorageWorkerApp, truncateStorageWorkerTables } from '@test/storage-worker-app';

interface SignInResponse {
  accessToken: string;
}
interface CreateStorageResponse {
  storageUUID: string;
}

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
    `UPDATE "accounts"."credential_accounts" SET status = 'active', email_verified_at = NOW() WHERE LOWER(email) = LOWER($1)`,
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
    `UPDATE "tenants"."tenant_config" tc SET tier = 'STARTER', max_warehouses = 3, max_custom_rooms = 3, max_store_rooms = 3, max_users = 5 FROM "tenants"."tenants" t WHERE t.id = tc.tenant_id AND t.name = $1`,
    [tenantName],
  );
}

async function createWarehouse(
  app: INestApplication,
  token: string,
  name: string,
): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/api/storages/warehouses')
    .set('Authorization', `Bearer ${token}`)
    .send({ name, address: 'Av. Industrial 500, CDMX' });
  return (res.body as CreateStorageResponse).storageUUID;
}

async function countWarehouses(dataSource: DataSource, uuid: string): Promise<number> {
  const rows = await dataSource.query(
    `SELECT COUNT(*)::int AS c FROM "storage"."warehouses" WHERE uuid = $1`,
    [uuid],
  );
  return rows[0].c;
}

async function countStoreRooms(dataSource: DataSource, uuid: string): Promise<number> {
  const rows = await dataSource.query(
    `SELECT COUNT(*)::int AS c FROM "storage"."store_rooms" WHERE uuid = $1`,
    [uuid],
  );
  return rows[0].c;
}

/**
 * Proves that the convert-to-* handlers wrap delete + save in a UoW transaction.
 * Forces a UNIQUE(uuid) collision on store_rooms by pre-inserting a row with
 * the same UUID the handler would try to save — save then throws and the
 * transaction must roll back, leaving the source warehouse intact.
 */
describe('PATCH convert-to-* (rollback E2E)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  const TENANT_NAME = 'RollbackConvert E2E';
  const OWNER_EMAIL = 'rollback.convert.owner@example.com';
  const OWNER_USERNAME = 'rollbackconvertowner';
  let ownerToken: string;

  beforeAll(async () => {
    const workerApp = await getStorageWorkerApp();
    app = workerApp.app;
    dataSource = workerApp.dataSource;
    await truncateStorageWorkerTables(dataSource);
    await signUp(app, dataSource, OWNER_EMAIL, OWNER_USERNAME);
    const tmp = await signIn(app, OWNER_EMAIL);
    await completeOnboarding(app, tmp, TENANT_NAME);
    ownerToken = await signIn(app, OWNER_EMAIL);
    await setTenantToStarter(dataSource, TENANT_NAME);
    ownerToken = await signIn(app, OWNER_EMAIL);
  });

  afterAll(async () => {
    await truncateStorageWorkerTables(dataSource);
  });

  describe('Given a warehouse and a pre-existing store_room row that shares the UUID the handler would insert', () => {
    it('Then the convert-to-store-room request fails and the source warehouse is still present', async () => {
      const whUUID = await createWarehouse(app, ownerToken, 'Rollback Source WH');
      expect(await countWarehouses(dataSource, whUUID)).toBe(1);

      // Pre-insert a store_room row with the same UUID so the handler's save
      // will hit a UNIQUE(uuid) violation, forcing rollback of the prior delete.
      const storageIdRow = await dataSource.query(
        `SELECT id FROM "storage"."storages" WHERE tenant_uuid = (SELECT tenant_uuid FROM "storage"."warehouses" WHERE uuid = $1)`,
        [whUUID],
      );
      const storageId = storageIdRow[0].id;

      await dataSource.query(
        `INSERT INTO "storage"."store_rooms" (uuid, storage_id, tenant_uuid, name, address, icon, color)
         VALUES ($1, $2, (SELECT tenant_uuid FROM "storage"."warehouses" WHERE uuid = $1), 'Colliding SR', 'addr', 'inventory_2', '#d97706')`,
        [whUUID, storageId],
      );

      const res = await request(app.getHttpServer())
        .patch(`/api/storages/warehouses/${whUUID}/convert-to-store-room`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(await countWarehouses(dataSource, whUUID)).toBe(1);
      // The pre-existing colliding store_room is still there (not altered)
      expect(await countStoreRooms(dataSource, whUUID)).toBe(1);
    });
  });
});

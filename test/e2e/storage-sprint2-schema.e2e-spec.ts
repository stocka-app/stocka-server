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
         max_custom_rooms = 10,
         max_store_rooms = 10,
         max_users = 5
     FROM "tenants"."tenants" t
     WHERE t.id = tc.tenant_id AND t.name = $1`,
    [tenantName],
  );
}

async function createStorage(
  app: INestApplication,
  token: string,
  payload: Record<string, unknown>,
): Promise<request.Response> {
  return request(app.getHttpServer())
    .post('/api/storages')
    .set('Authorization', `Bearer ${token}`)
    .send(payload);
}

async function getStorage(
  app: INestApplication,
  token: string,
  uuid: string,
): Promise<request.Response> {
  return request(app.getHttpServer())
    .get(`/api/storages/${uuid}`)
    .set('Authorization', `Bearer ${token}`);
}

// ─── Spec ─────────────────────────────────────────────────────────────────────

describe('Storage BC — Sprint 2 Schema (sub-table fields)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let token: string;

  const TENANT = 'SchemaTestCo';
  const EMAIL = 'schematest@example.com';
  const USERNAME = 'schematestuser';

  beforeAll(async () => {
    ({ app, dataSource } = await getStorageWorkerApp());
    await truncateStorageWorkerTables(dataSource);

    await signUp(app, dataSource, EMAIL, USERNAME);
    token = await signIn(app, EMAIL);
    await completeOnboarding(app, token, TENANT);
    token = await signIn(app, EMAIL);
    await setTenantToStarter(dataSource, TENANT);
  });

  describe('Given a tenant on STARTER tier', () => {
    describe('When creating a WAREHOUSE with icon, color, and description', () => {
      it('Then the warehouse fields are stored in the warehouses sub-table and returned', async () => {
        const createRes = await createStorage(app, token, {
          type: 'WAREHOUSE',
          name: 'Schema Test WH',
          description: 'A warehouse for schema validation',
          icon: 'warehouse-icon',
          color: '#1A2B3C',
        });

        expect(createRes.status).toBe(HttpStatus.CREATED);
        expect(createRes.body).toHaveProperty('storageUUID');
        const uuid = (createRes.body as CreateStorageResponse).storageUUID;

        const getRes = await getStorage(app, token, uuid);
        expect(getRes.status).toBe(HttpStatus.OK);
        expect(getRes.body.icon).toBe('warehouse-icon');
        expect(getRes.body.color).toBe('#1A2B3C');
        expect(getRes.body.description).toBe('A warehouse for schema validation');
        expect(getRes.body.parentId).toBeNull();
      });
    });

    describe('When creating a CUSTOM_ROOM with icon and color', () => {
      it('Then icon and color are persisted in the custom_rooms sub-table', async () => {
        const createRes = await createStorage(app, token, {
          type: 'CUSTOM_ROOM',
          name: 'Schema Test Room',
          description: 'Custom room with all fields',
          roomType: 'Office',
          icon: 'room-icon',
          color: '#AABBCC',
        });

        expect(createRes.status).toBe(HttpStatus.CREATED);
        const uuid = (createRes.body as CreateStorageResponse).storageUUID;

        const getRes = await getStorage(app, token, uuid);
        expect(getRes.status).toBe(HttpStatus.OK);
        expect(getRes.body.icon).toBe('room-icon');
        expect(getRes.body.color).toBe('#AABBCC');
        expect(getRes.body.description).toBe('Custom room with all fields');
        expect(getRes.body.parentId).toBeNull();
      });
    });

    describe('When creating a STORE_ROOM with a parentId referencing a warehouse', () => {
      it('Then the parentId is persisted in storages registry and returned', async () => {
        const parentRes = await createStorage(app, token, {
          type: 'WAREHOUSE',
          name: 'Parent Warehouse',
        });
        expect(parentRes.status).toBe(HttpStatus.CREATED);
        const parentUUID = (parentRes.body as CreateStorageResponse).storageUUID;

        const childRes = await createStorage(app, token, {
          type: 'STORE_ROOM',
          name: 'Child Store Room',
          parentId: parentUUID,
        });
        expect(childRes.status).toBe(HttpStatus.CREATED);
        const childUUID = (childRes.body as CreateStorageResponse).storageUUID;

        const getRes = await getStorage(app, token, childUUID);
        expect(getRes.status).toBe(HttpStatus.OK);
        expect(getRes.body.parentId).toBe(parentUUID);
      });
    });

    describe('When creating a storage without a parentId', () => {
      it('Then parentId in response is null', async () => {
        const createRes = await createStorage(app, token, {
          type: 'CUSTOM_ROOM',
          name: 'No Parent Room',
          roomType: 'Storage',
        });
        expect(createRes.status).toBe(HttpStatus.CREATED);

        const getRes = await getStorage(app, token, (createRes.body as CreateStorageResponse).storageUUID);
        expect(getRes.status).toBe(HttpStatus.OK);
        expect(getRes.body.parentId).toBeNull();
      });
    });

    describe('When creating a storage with a valid description', () => {
      it('Then the description is persisted and returned', async () => {
        const createRes = await createStorage(app, token, {
          type: 'CUSTOM_ROOM',
          name: 'Described Room',
          roomType: 'Office',
          description: 'Room description text here',
        });
        expect(createRes.status).toBe(HttpStatus.CREATED);

        const getRes = await getStorage(app, token, (createRes.body as CreateStorageResponse).storageUUID);
        expect(getRes.status).toBe(HttpStatus.OK);
        expect(getRes.body.description).toBe('Room description text here');
      });
    });

    describe('When creating a storage with a description shorter than 5 characters', () => {
      it('Then the API returns 400', async () => {
        const res = await createStorage(app, token, {
          type: 'CUSTOM_ROOM',
          name: 'Bad Desc Room',
          roomType: 'Office',
          description: 'Hi',
        });
        expect(res.status).toBe(HttpStatus.BAD_REQUEST);
      });
    });
  });
});

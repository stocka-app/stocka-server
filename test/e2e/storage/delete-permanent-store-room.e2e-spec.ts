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
    .send({ name });
  return (res.body as CreateStorageResponse).storageUUID;
}

async function archiveStoreRoom(
  app: INestApplication,
  token: string,
  uuid: string,
): Promise<void> {
  await request(app.getHttpServer())
    .delete(`/api/storages/store-rooms/${uuid}/archive`)
    .set('Authorization', `Bearer ${token}`);
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

async function getActivityLogActions(
  dataSource: DataSource,
  storageUUID: string,
): Promise<string[]> {
  const rows = (await dataSource.query(
    `SELECT action FROM "storage"."storage_activity_log"
     WHERE storage_uuid = $1
     ORDER BY occurred_at ASC`,
    [storageUUID],
  )) as { action: string }[];
  return rows.map((r) => r.action);
}

describe('DELETE /api/storages/store-rooms/:uuid/permanent (E2E — H-08)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  const TENANT_NAME = 'DeletePermStoreRoom E2E Business';
  const OWNER_EMAIL = 'delete.perm.storeroom.owner@example.com';
  const OWNER_USERNAME = 'deletepermstoreroomowner';

  const OTHER_TENANT_NAME = 'Other StoreRoom Tenant';
  const OTHER_OWNER_EMAIL = 'other.storeroom.owner@example.com';
  const OTHER_OWNER_USERNAME = 'otherstoreroomowner';

  let ownerToken: string;
  let otherOwnerToken: string;

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

    await signUp(app, dataSource, OTHER_OWNER_EMAIL, OTHER_OWNER_USERNAME);
    const otherTempToken = await signIn(app, OTHER_OWNER_EMAIL);
    await completeOnboarding(app, otherTempToken, OTHER_TENANT_NAME);
    otherOwnerToken = await signIn(app, OTHER_OWNER_EMAIL);
    await setTenantToStarter(dataSource, OTHER_TENANT_NAME);
    otherOwnerToken = await signIn(app, OTHER_OWNER_EMAIL);
  });

  afterAll(async () => {
    await truncateStorageWorkerTables(dataSource);
  });

  describe('Given an ARCHIVED store-room', () => {
    let uuid: string;

    beforeAll(async () => {
      uuid = await createStoreRoom(app, ownerToken, 'Perm-Delete Alpha SR');
      await archiveStoreRoom(app, ownerToken, uuid);
    });

    describe('When permanent delete is requested', () => {
      it('Then it returns 204 NO_CONTENT and the store-room no longer exists', async () => {
        const res = await request(app.getHttpServer())
          .delete(`/api/storages/store-rooms/${uuid}/permanent`)
          .set('Authorization', `Bearer ${ownerToken}`);

        expect(res.status).toBe(HttpStatus.NO_CONTENT);
        expect(res.body).toEqual({});

        const getRes = await request(app.getHttpServer())
          .get(`/api/storages/${uuid}`)
          .set('Authorization', `Bearer ${ownerToken}`);
        expect(getRes.status).toBe(HttpStatus.NOT_FOUND);
      });

      it('Then a DELETED entry is appended to the storage_activity_log via the event listener', async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));

        const actions = await getActivityLogActions(dataSource, uuid);
        expect(actions).toContain('DELETED');
      });
    });
  });

  describe('Given an ACTIVE store-room', () => {
    let uuid: string;

    beforeAll(async () => {
      uuid = await createStoreRoom(app, ownerToken, 'Perm-Delete Active SR');
    });

    describe('When permanent delete is requested', () => {
      it('Then it returns 409 STORAGE_NOT_ARCHIVED and the store-room remains untouched', async () => {
        const res = await request(app.getHttpServer())
          .delete(`/api/storages/store-rooms/${uuid}/permanent`)
          .set('Authorization', `Bearer ${ownerToken}`);

        expect(res.status).toBe(HttpStatus.CONFLICT);
        expect(res.body.error).toBe('STORAGE_NOT_ARCHIVED');

        const getRes = await request(app.getHttpServer())
          .get(`/api/storages/${uuid}`)
          .set('Authorization', `Bearer ${ownerToken}`);
        expect(getRes.status).toBe(HttpStatus.OK);
        expect(getRes.body.status).toBe('ACTIVE');
      });
    });
  });

  describe('Given a FROZEN store-room', () => {
    let uuid: string;

    beforeAll(async () => {
      uuid = await createStoreRoom(app, ownerToken, 'Perm-Delete Frozen SR');
      await freezeStoreRoom(app, ownerToken, uuid);
    });

    describe('When permanent delete is requested', () => {
      it('Then it returns 409 STORAGE_NOT_ARCHIVED', async () => {
        const res = await request(app.getHttpServer())
          .delete(`/api/storages/store-rooms/${uuid}/permanent`)
          .set('Authorization', `Bearer ${ownerToken}`);

        expect(res.status).toBe(HttpStatus.CONFLICT);
        expect(res.body.error).toBe('STORAGE_NOT_ARCHIVED');
      });
    });
  });

  describe('Given a non-existent store-room UUID', () => {
    describe('When permanent delete is requested', () => {
      it('Then it returns 404 STORAGE_NOT_FOUND', async () => {
        const fakeUUID = '00000000-0000-0000-0000-000000000000';
        const res = await request(app.getHttpServer())
          .delete(`/api/storages/store-rooms/${fakeUUID}/permanent`)
          .set('Authorization', `Bearer ${ownerToken}`);

        expect(res.status).toBe(HttpStatus.NOT_FOUND);
        expect(res.body.error).toBe('STORAGE_NOT_FOUND');
      });
    });
  });

  describe('Given a store-room owned by another tenant', () => {
    let otherTenantUUID: string;

    beforeAll(async () => {
      otherTenantUUID = await createStoreRoom(app, otherOwnerToken, 'Cross-Tenant SR');
      await archiveStoreRoom(app, otherOwnerToken, otherTenantUUID);
    });

    describe('When permanent delete is attempted from a different tenant', () => {
      it('Then it returns 404 STORAGE_NOT_FOUND (tenant isolation)', async () => {
        const res = await request(app.getHttpServer())
          .delete(`/api/storages/store-rooms/${otherTenantUUID}/permanent`)
          .set('Authorization', `Bearer ${ownerToken}`);

        expect(res.status).toBe(HttpStatus.NOT_FOUND);
        expect(res.body.error).toBe('STORAGE_NOT_FOUND');

        const getRes = await request(app.getHttpServer())
          .get(`/api/storages/${otherTenantUUID}`)
          .set('Authorization', `Bearer ${otherOwnerToken}`);
        expect(getRes.status).toBe(HttpStatus.OK);
      });
    });
  });

  describe('Given an unauthenticated client', () => {
    describe('When permanent delete is called without a token', () => {
      it('Then it returns 401 UNAUTHORIZED', async () => {
        const fakeUUID = '00000000-0000-0000-0000-000000000000';
        const res = await request(app.getHttpServer()).delete(
          `/api/storages/store-rooms/${fakeUUID}/permanent`,
        );

        expect(res.status).toBe(HttpStatus.UNAUTHORIZED);
      });
    });
  });

  describe('Given the same UUID is permanently deleted twice in rapid succession (concurrency)', () => {
    let uuid: string;

    beforeAll(async () => {
      uuid = await createStoreRoom(app, ownerToken, 'Perm-Delete Concurrency SR');
      await archiveStoreRoom(app, ownerToken, uuid);
      const firstRes = await request(app.getHttpServer())
        .delete(`/api/storages/store-rooms/${uuid}/permanent`)
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(firstRes.status).toBe(HttpStatus.NO_CONTENT);
    });

    describe('When the second permanent delete arrives', () => {
      it('Then it returns 404 STORAGE_NOT_FOUND', async () => {
        const res = await request(app.getHttpServer())
          .delete(`/api/storages/store-rooms/${uuid}/permanent`)
          .set('Authorization', `Bearer ${ownerToken}`);

        expect(res.status).toBe(HttpStatus.NOT_FOUND);
        expect(res.body.error).toBe('STORAGE_NOT_FOUND');
      });
    });
  });
});

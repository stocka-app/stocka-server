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

async function createCustomRoom(
  app: INestApplication,
  token: string,
  name: string,
  roomType: string = 'General',
): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/api/storages/custom-rooms')
    .set('Authorization', `Bearer ${token}`)
    .send({ name, roomType, icon: 'default-icon', color: '#AABBCC', address: '100 Test St' });
  return (res.body as CreateStorageResponse).storageUUID;
}

// ─── Spec ─────────────────────────────────────────────────────────────────────

describe('POST /api/storages/custom-rooms (e2e)', () => {
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

  describe('Given a tenant on STARTER with max_custom_rooms=3 and rooms filling the quota', () => {
    let starterToken: string;

    beforeAll(async () => {
      const EMAIL = 'postcreatecustomroom.starter@example.com';
      const USERNAME = 'postcreatecustomroomstarter';
      await signUp(app, dataSource, EMAIL, USERNAME);
      const tempToken = await signIn(app, EMAIL);
      await completeOnboarding(app, tempToken, 'PostCreateCustomRoom Starter Limit Biz');
      starterToken = await signIn(app, EMAIL);
      await setTenantToStarter(dataSource, 'PostCreateCustomRoom Starter Limit Biz');
      starterToken = await signIn(app, EMAIL);

      // Onboarding already created 1 custom room (Tienda Principal for retail).
      // Create 2 more to reach the STARTER limit of 3.
      await createCustomRoom(app, starterToken, 'Custom Room Limit 2');
      await createCustomRoom(app, starterToken, 'Custom Room Limit 3');
    });

    describe('When POST /api/storages/custom-rooms is called with a room that exceeds the limit', () => {
      it('Then it returns 403 (CustomRoomLimitReachedError)', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/storages/custom-rooms')
          .set('Authorization', `Bearer ${starterToken}`)
          .send({
            name: 'Custom Room Over Limit',
            roomType: 'General',
            icon: 'icon',
            color: '#AABBCC',
            address: '100 St',
          });

        expect(res.status).toBe(HttpStatus.FORBIDDEN);
      });
    });
  });

  describe('Given a tenant with an existing custom room', () => {
    let ownerToken: string;

    beforeAll(async () => {
      const EMAIL = 'postcreatecustomroom.dupname@example.com';
      const USERNAME = 'postcreatecustomroomdupname';
      await signUp(app, dataSource, EMAIL, USERNAME);
      const tempToken = await signIn(app, EMAIL);
      await completeOnboarding(app, tempToken, 'PostCreateCustomRoom DupName Biz');
      ownerToken = await signIn(app, EMAIL);
      await setTenantToStarter(dataSource, 'PostCreateCustomRoom DupName Biz');
      ownerToken = await signIn(app, EMAIL);

      await createCustomRoom(app, ownerToken, 'PostCreateCustomRoom Existing Storage');
    });

    describe('When POST /api/storages/custom-rooms is called with a name that already exists', () => {
      it('Then it returns 409 (StorageNameAlreadyExistsError)', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/storages/custom-rooms')
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({
            name: 'PostCreateCustomRoom Existing Storage',
            roomType: 'General',
            icon: 'icon',
            color: '#AABBCC',
            address: '100 St',
          });

        expect(res.status).toBe(HttpStatus.CONFLICT);
        expect(res.body.error).toBe('STORAGE_NAME_ALREADY_EXISTS');
      });
    });
  });

  describe('Given a STARTER tenant with available custom room capacity', () => {
    let ownerToken: string;

    beforeAll(async () => {
      const EMAIL = 'postcreatecustomroom.happy@example.com';
      const USERNAME = 'postcreatecustomroomhappy';
      await signUp(app, dataSource, EMAIL, USERNAME);
      const tempToken = await signIn(app, EMAIL);
      await completeOnboarding(app, tempToken, 'PostCreateCustomRoom Happy Path Biz');
      ownerToken = await signIn(app, EMAIL);
      await setTenantToStarter(dataSource, 'PostCreateCustomRoom Happy Path Biz');
      ownerToken = await signIn(app, EMAIL);
    });

    describe('When POST /api/storages/custom-rooms is called with valid data', () => {
      it('Then it returns 201 and a storageUUID', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/storages/custom-rooms')
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({
            name: 'Happy Path Custom Room',
            roomType: 'General',
            icon: 'box',
            color: '#6366F1',
            address: '123 Main St',
          });

        expect(res.status).toBe(HttpStatus.CREATED);
        expect(res.body.storageUUID).toBeDefined();
      });
    });
  });
});

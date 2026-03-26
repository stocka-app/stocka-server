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
  // Upgrade tier and set STARTER limits so the CreateStorageHandler allows warehouses
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
  payload: { type: string; name: string; address?: string; roomType?: string },
): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/api/storages')
    .set('Authorization', `Bearer ${token}`)
    .send(payload);
  return (res.body as CreateStorageResponse).storageUUID;
}

async function archiveStorage(
  app: INestApplication,
  token: string,
  uuid: string,
): Promise<void> {
  await request(app.getHttpServer())
    .delete(`/api/storages/${uuid}`)
    .set('Authorization', `Bearer ${token}`);
}

// ─── Spec ─────────────────────────────────────────────────────────────────────

describe('List Storages — GET /api/storages (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  const TENANT_A_NAME = 'List E2E Business Alpha';
  const TENANT_B_NAME = 'List E2E Business Beta';
  const OWNER_A_EMAIL = 'list.e2e.owner.a@example.com';
  const OWNER_A_USERNAME = 'liste2eownera';
  const OWNER_B_EMAIL = 'list.e2e.owner.b@example.com';
  const OWNER_B_USERNAME = 'liste2eownerb';

  let ownerAToken: string;
  let ownerBToken: string;
  let warehouseUUID: string;
  let customRoomUUID: string;

  beforeAll(async () => {
    const workerApp = await getStorageWorkerApp();
    app = workerApp.app;
    dataSource = workerApp.dataSource;

    // ── Tenant A setup ──────────────────────────────────────────────────────
    await signUp(app, dataSource, OWNER_A_EMAIL, OWNER_A_USERNAME);
    const tempTokenA = await signIn(app, OWNER_A_EMAIL);
    await completeOnboarding(app, tempTokenA, TENANT_A_NAME);
    ownerAToken = await signIn(app, OWNER_A_EMAIL);

    // Upgrade tenant A to STARTER (warehouses require STARTER+)
    await setTenantToStarter(dataSource, TENANT_A_NAME);
    // Re-sign-in to pick up the tier-refreshed capabilities
    ownerAToken = await signIn(app, OWNER_A_EMAIL);

    // Create storage data for tenant A: 1 WAREHOUSE (active) + 1 CUSTOM_ROOM (to be archived)
    warehouseUUID = await createStorage(app, ownerAToken, {
      type: 'WAREHOUSE',
      name: 'Almacén Central',
      address: 'Av. Industrial 100, Monterrey',
    });
    customRoomUUID = await createStorage(app, ownerAToken, {
      type: 'CUSTOM_ROOM',
      name: 'Sala de Exhibición',
      roomType: 'Exhibition',
    });

    // Archive the custom room so we have both ACTIVE and ARCHIVED in the DB
    await archiveStorage(app, ownerAToken, customRoomUUID);

    // ── Tenant B setup (for isolation test) ────────────────────────────────
    await signUp(app, dataSource, OWNER_B_EMAIL, OWNER_B_USERNAME);
    const tempTokenB = await signIn(app, OWNER_B_EMAIL);
    await completeOnboarding(app, tempTokenB, TENANT_B_NAME);
    ownerBToken = await signIn(app, OWNER_B_EMAIL);
    await setTenantToStarter(dataSource, TENANT_B_NAME);
    ownerBToken = await signIn(app, OWNER_B_EMAIL);

    await createStorage(app, ownerBToken, {
      type: 'STORE_ROOM',
      name: "Bodega Tenant B — should not appear in tenant A's list",
    });
  });

  afterAll(async () => {
    await truncateStorageWorkerTables(dataSource);
  });

  // ── E2E-L1: no filter → all states ──────────────────────────────────────

  describe('Given a tenant with one active warehouse and one archived custom room', () => {
    describe('When GET /api/storages is called without filters', () => {
      it('Then it returns all storages regardless of status', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/storages')
          .set('Authorization', `Bearer ${ownerAToken}`);

        expect(res.status).toBe(HttpStatus.OK);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body).toHaveLength(2);

        const uuids: string[] = res.body.map((s: { uuid: string }) => s.uuid);
        expect(uuids).toContain(warehouseUUID);
        expect(uuids).toContain(customRoomUUID);
      });
    });
  });

  // ── E2E-L2: status=FROZEN → empty (no frozen storages in DB) ────────────

  describe('Given the tenant has no frozen storages', () => {
    describe('When GET /api/storages?status=FROZEN is called', () => {
      it('Then it returns an empty array', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/storages?status=FROZEN')
          .set('Authorization', `Bearer ${ownerAToken}`);

        expect(res.status).toBe(HttpStatus.OK);
        expect(res.body).toEqual([]);
      });
    });
  });

  // ── E2E-L3: status=ACTIVE&type=WAREHOUSE → only active warehouses ────────

  describe('Given a tenant with an active warehouse and an archived custom room', () => {
    describe('When GET /api/storages?status=ACTIVE&type=WAREHOUSE is called', () => {
      it('Then it returns only the active warehouse', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/storages?status=ACTIVE&type=WAREHOUSE')
          .set('Authorization', `Bearer ${ownerAToken}`);

        expect(res.status).toBe(HttpStatus.OK);
        expect(res.body).toHaveLength(1);
        expect(res.body[0].uuid).toBe(warehouseUUID);
        expect(res.body[0].type).toBe('WAREHOUSE');
        expect(res.body[0].status).toBe('ACTIVE');
        expect(res.body[0].archivedAt).toBeNull();
      });
    });
  });

  // ── StorageOutDto fields ──────────────────────────────────────────────────

  describe('Given a tenant has an active warehouse', () => {
    describe('When GET /api/storages?type=WAREHOUSE is called', () => {
      it('Then the response includes all expected StorageOutDto fields', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/storages?type=WAREHOUSE')
          .set('Authorization', `Bearer ${ownerAToken}`);

        expect(res.status).toBe(HttpStatus.OK);
        expect(res.body).toHaveLength(1);

        const storage = res.body[0];
        expect(storage).toMatchObject({
          uuid: warehouseUUID,
          status: 'ACTIVE',
          type: 'WAREHOUSE',
          name: 'Almacén Central',
          address: 'Av. Industrial 100, Monterrey',
          roomType: null,
          archivedAt: null,
        });
        expect(storage.createdAt).toBeDefined();
        expect(storage.updatedAt).toBeDefined();
      });
    });
  });

  // ── Tenant isolation ──────────────────────────────────────────────────────

  describe('Given two tenants each with their own storages', () => {
    describe('When tenant A calls GET /api/storages', () => {
      it('Then it returns only tenant A storages — not tenant B', async () => {
        const resA = await request(app.getHttpServer())
          .get('/api/storages')
          .set('Authorization', `Bearer ${ownerAToken}`);
        const resB = await request(app.getHttpServer())
          .get('/api/storages')
          .set('Authorization', `Bearer ${ownerBToken}`);

        expect(resA.status).toBe(HttpStatus.OK);
        expect(resB.status).toBe(HttpStatus.OK);

        const uuidsA: string[] = resA.body.map((s: { uuid: string }) => s.uuid);
        const uuidsB: string[] = resB.body.map((s: { uuid: string }) => s.uuid);

        // Tenant A's storages are only their own
        expect(uuidsA).toContain(warehouseUUID);
        expect(uuidsA).toContain(customRoomUUID);

        // No overlap between tenants
        const overlap = uuidsA.filter((uuid) => uuidsB.includes(uuid));
        expect(overlap).toHaveLength(0);
      });
    });
  });

  // ── Invalid query param ───────────────────────────────────────────────────

  describe('Given a request with an invalid status value', () => {
    describe('When GET /api/storages?status=INVALID is called', () => {
      it('Then it returns 400 Bad Request', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/storages?status=INVALID')
          .set('Authorization', `Bearer ${ownerAToken}`);

        expect(res.status).toBe(HttpStatus.BAD_REQUEST);
      });
    });
  });
});

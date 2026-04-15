import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { QueryBus } from '@nestjs/cqrs';
import { getStorageWorkerApp, truncateStorageWorkerTables } from '@test/storage-worker-app';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { IStorageRepository } from '@storage/domain/contracts/storage.repository.contract';
import { ListStoragesQuery } from '@storage/application/queries/list-storages/list-storages.query';
import { StorageItemPage } from '@storage/domain/schemas';

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

/**
 * Upgrades a tenant to STARTER tier AND sets all capacity limits to STARTER values.
 *
 * Use this helper instead of `setTenantTier()` whenever a test needs to create storages
 * that require STARTER+ type limits (e.g. warehouses, custom rooms, store rooms). Unlike
 * `setTenantTier()`, which only updates the tier column, this function also sets
 * max_warehouses / max_custom_rooms / max_store_rooms / max_users — matching the actual
 * values written by the onboarding flow. Without these capacity columns, the
 * CreateStorageHandler will reject the request even if the tier field says STARTER.
 */
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

const STORAGE_ROUTES: Record<string, string> = {
  WAREHOUSE: '/api/storages/warehouses',
  CUSTOM_ROOM: '/api/storages/custom-rooms',
  STORE_ROOM: '/api/storages/store-rooms',
};

async function createStorage(
  app: INestApplication,
  token: string,
  payload: {
    type: string;
    name: string;
    address?: string;
    roomType?: string;
    icon?: string;
    color?: string;
  },
): Promise<string> {
  const { type, ...body } = payload;
  const res = await request(app.getHttpServer())
    .post(STORAGE_ROUTES[type])
    .set('Authorization', `Bearer ${token}`)
    .send({ address: '100 Test St', ...body });
  return (res.body as CreateStorageResponse).storageUUID;
}

async function archiveCustomRoom(app: INestApplication, token: string, uuid: string): Promise<void> {
  await request(app.getHttpServer())
    .delete(`/api/storages/custom-rooms/${uuid}/archive`)
    .set('Authorization', `Bearer ${token}`);
}

async function archiveStoreRoom(app: INestApplication, token: string, uuid: string): Promise<void> {
  await request(app.getHttpServer())
    .delete(`/api/storages/store-rooms/${uuid}/archive`)
    .set('Authorization', `Bearer ${token}`);
}

async function freezeStoreRoom(dataSource: DataSource, uuid: string): Promise<void> {
  await dataSource.query(`UPDATE storage.store_rooms SET frozen_at = NOW() WHERE uuid = $1`, [
    uuid,
  ]);
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
    await truncateStorageWorkerTables(dataSource);

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
    await archiveCustomRoom(app, ownerAToken, customRoomUUID);

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

  // ── E2E-L1: no filter → all statuses ────────────────────────────────────

  describe('Given a tenant with one active warehouse and one archived custom room', () => {
    describe('When GET /api/storages is called without filters', () => {
      it('Then it returns all storages with pagination metadata and typeSummary in the response', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/storages')
          .set('Authorization', `Bearer ${ownerAToken}`);

        expect(res.status).toBe(HttpStatus.OK);
        expect(Array.isArray(res.body.items)).toBe(true);
        // No status param → no filter applied → both ACTIVE and ARCHIVED storages are returned
        expect(res.body.items).toHaveLength(2);
        expect(res.body.total).toBe(2);
        expect(res.body.page).toBe(1);
        expect(res.body.totalPages).toBe(1);

        const uuids: string[] = res.body.items.map((s: { uuid: string }) => s.uuid);
        expect(uuids).toContain(warehouseUUID);
        expect(uuids).toContain(customRoomUUID);

        // typeSummary is always included in every list response
        expect(res.body.typeSummary).toBeDefined();
        expect(res.body.typeSummary.WAREHOUSE).toEqual({ active: 1, frozen: 0, archived: 0 });
        expect(res.body.typeSummary.STORE_ROOM).toEqual({ active: 0, frozen: 0, archived: 0 });
        expect(res.body.typeSummary.CUSTOM_ROOM).toEqual({ active: 0, frozen: 0, archived: 1 });
      });
    });
  });

  // ── E2E-L2: status=FROZEN → empty (no frozen storages in DB) ────────────

  describe('Given the tenant has no frozen storages', () => {
    describe('When GET /api/storages?status=FROZEN is called', () => {
      it('Then it returns an empty page', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/storages?status=FROZEN')
          .set('Authorization', `Bearer ${ownerAToken}`);

        expect(res.status).toBe(HttpStatus.OK);
        expect(res.body.items).toEqual([]);
        expect(res.body.total).toBe(0);
        expect(res.body.page).toBe(1);
        expect(res.body.totalPages).toBe(0);
      });
    });
  });

  // ── E2E-L2b: status=ARCHIVED → only archived storages ───────────────────

  describe('Given a tenant with one archived custom room', () => {
    describe('When GET /api/storages?status=ARCHIVED is called', () => {
      it('Then it returns only the archived custom room', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/storages?status=ARCHIVED')
          .set('Authorization', `Bearer ${ownerAToken}`);

        expect(res.status).toBe(HttpStatus.OK);
        expect(res.body.items).toHaveLength(1);
        expect(res.body.total).toBe(1);
        expect(res.body.items[0].uuid).toBe(customRoomUUID);
        expect(res.body.items[0].type).toBe('CUSTOM_ROOM');
        expect(res.body.items[0].archivedAt).not.toBeNull();
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
        expect(res.body.items).toHaveLength(1);
        expect(res.body.total).toBe(1);
        expect(res.body.items[0].uuid).toBe(warehouseUUID);
        expect(res.body.items[0].type).toBe('WAREHOUSE');
        expect(res.body.items[0].status).toBe('ACTIVE');
        expect(res.body.items[0].archivedAt).toBeNull();
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
        expect(res.body.items).toHaveLength(1);

        const storage = res.body.items[0];
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

        const uuidsA: string[] = resA.body.items.map((s: { uuid: string }) => s.uuid);
        const uuidsB: string[] = resB.body.items.map((s: { uuid: string }) => s.uuid);

        // Tenant A's active storages are only their own (archived items not included in default ACTIVE filter)
        expect(uuidsA).toContain(warehouseUUID);

        // No overlap between tenants
        const overlap = uuidsA.filter((uuid) => uuidsB.includes(uuid));
        expect(overlap).toHaveLength(0);
      });
    });
  });

  // ── sortOrder=DESC ────────────────────────────────────────────────────────

  describe('Given a tenant with two archived storages and sortOrder=DESC', () => {
    let firstUUID: string;
    let secondUUID: string;

    beforeAll(async () => {
      firstUUID = await createStorage(app, ownerAToken, {
        type: 'STORE_ROOM',
        name: 'Alpha Store Room',
      });
      secondUUID = await createStorage(app, ownerAToken, {
        type: 'STORE_ROOM',
        name: 'Zeta Store Room',
      });
      await archiveStoreRoom(app, ownerAToken, firstUUID);
      await archiveStoreRoom(app, ownerAToken, secondUUID);
    });

    describe('When GET /api/storages?status=ARCHIVED&sortOrder=DESC is called', () => {
      it('Then it returns archived storages with Zeta before Alpha', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/storages?status=ARCHIVED&sortOrder=DESC')
          .set('Authorization', `Bearer ${ownerAToken}`);

        expect(res.status).toBe(HttpStatus.OK);
        const names: string[] = res.body.items.map((s: { name: string }) => s.name);
        const zetaIdx = names.findIndex((n) => n === 'Zeta Store Room');
        const alphaIdx = names.findIndex((n) => n === 'Alpha Store Room');
        expect(zetaIdx).toBeLessThan(alphaIdx);
      });
    });

    describe('When GET /api/storages?status=ARCHIVED&sortOrder=ASC is called', () => {
      it('Then it returns archived storages with Alpha before Zeta', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/storages?status=ARCHIVED&sortOrder=ASC')
          .set('Authorization', `Bearer ${ownerAToken}`);

        expect(res.status).toBe(HttpStatus.OK);
        const names: string[] = res.body.items.map((s: { name: string }) => s.name);
        const alphaIdx = names.findIndex((n) => n === 'Alpha Store Room');
        const zetaIdx = names.findIndex((n) => n === 'Zeta Store Room');
        expect(alphaIdx).toBeLessThan(zetaIdx);
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

  // ── E2E-L4: pagination + search ──────────────────────────────────────────

  describe('Given a tenant with multiple storages and a search term', () => {
    describe('When GET /api/storages?search=Almacén&limit=1&page=1 is called', () => {
      it('Then it returns the matching storage with pagination metadata', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/storages?search=Almac%C3%A9n&limit=1&page=1')
          .set('Authorization', `Bearer ${ownerAToken}`);

        expect(res.status).toBe(HttpStatus.OK);
        expect(res.body.items).toHaveLength(1);
        expect(res.body.items[0].name).toBe('Almacén Central');
        expect(res.body.total).toBeGreaterThanOrEqual(1);
        expect(res.body.page).toBe(1);
        expect(res.body.limit).toBe(1);
      });
    });
  });

  // ── Repository: no status filter → all storages regardless of status ──────

  describe('Given storages of multiple statuses exist for a tenant', () => {
    describe('When the repository is called with no status filter', () => {
      it('Then it returns all storages regardless of status', async () => {
        const rows: Array<{ uuid: string }> = await dataSource.query(
          `SELECT t.uuid FROM "tenants"."tenants" t
           JOIN "tenants"."tenant_members" tm ON tm.tenant_id = t.id
           JOIN "accounts"."credential_accounts" ca ON LOWER(ca.email) = LOWER($1)
           JOIN "identity"."users" u ON u.id = ca.account_id AND u.id = tm.user_id
           LIMIT 1`,
          [OWNER_A_EMAIL],
        );
        const tenantUUID: string = rows[0].uuid;

        const repo = app.get<IStorageRepository>(INJECTION_TOKENS.STORAGE_CONTRACT);
        // Call findOrCreate and list all items — no filter applied
        const aggregate = await repo.findOrCreate(tenantUUID);
        const items = aggregate.listItemViews();

        // Tenant A has 1 active warehouse + 1 archived custom room = 2 total
        expect(items.length).toBeGreaterThanOrEqual(2);
      });
    });
  });

  // ── Frozen storage: FROZEN filter with real frozen items ─────────────────
  // Sets frozen_at directly via SQL (no HTTP freeze endpoint exists yet).
  // Covers the FROZEN else-if body in list-storages.handler.ts, including
  // both sides of the `frozenAt !== null && archivedAt === null` expression.

  describe('Given a tenant has a frozen storage', () => {
    let frozenStoreRoomUUID: string;

    beforeAll(async () => {
      frozenStoreRoomUUID = await createStorage(app, ownerAToken, {
        type: 'STORE_ROOM',
        name: 'Cryo Store Room',
      });
      await freezeStoreRoom(dataSource, frozenStoreRoomUUID);
    });

    describe('When GET /api/storages?status=FROZEN is called', () => {
      it('Then it returns only frozen storages (excluding archived ones)', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/storages?status=FROZEN')
          .set('Authorization', `Bearer ${ownerAToken}`);

        expect(res.status).toBe(HttpStatus.OK);
        const uuids: string[] = res.body.items.map((s: { uuid: string }) => s.uuid);
        expect(uuids).toContain(frozenStoreRoomUUID);
        const frozenItem = res.body.items.find(
          (s: { uuid: string }) => s.uuid === frozenStoreRoomUUID,
        );
        expect(frozenItem.frozenAt).not.toBeNull();
        expect(frozenItem.archivedAt).toBeNull();
      });
    });
  });

  // ── QueryBus: no status filter → handler returns all items unfiltered ────

  describe('Given the ListStoragesQuery is dispatched without a status filter', () => {
    describe('When the QueryBus executes the query with no status in filters', () => {
      it('Then it returns all storages with typeSummary populated for each type', async () => {
        const rows: Array<{ uuid: string }> = await dataSource.query(
          `SELECT t.uuid FROM "tenants"."tenants" t
           JOIN "tenants"."tenant_members" tm ON tm.tenant_id = t.id
           JOIN "accounts"."credential_accounts" ca ON LOWER(ca.email) = LOWER($1)
           JOIN "identity"."users" u ON u.id = ca.account_id AND u.id = tm.user_id
           LIMIT 1`,
          [OWNER_A_EMAIL],
        );
        const tenantUUID: string = rows[0].uuid;

        const queryBus = app.get<QueryBus>(QueryBus);
        const result = await queryBus.execute<ListStoragesQuery, StorageItemPage>(
          new ListStoragesQuery(tenantUUID, {}, { page: 1, limit: 50 }, 'ASC'),
        );

        // No status filter — all items (active + archived + frozen) are returned
        expect(result.total).toBeGreaterThanOrEqual(3);

        // typeSummary is always present in the result
        expect(result.typeSummary).toBeDefined();
        expect(result.typeSummary.WAREHOUSE).toBeDefined();
        expect(result.typeSummary.STORE_ROOM).toBeDefined();
        expect(result.typeSummary.CUSTOM_ROOM).toBeDefined();

        // Each type bucket has the correct shape
        const wh = result.typeSummary.WAREHOUSE;
        expect(typeof wh.active).toBe('number');
        expect(typeof wh.frozen).toBe('number');
        expect(typeof wh.archived).toBe('number');
      });
    });
  });
});

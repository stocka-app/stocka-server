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
  payload: { type: string; name: string; address?: string; roomType?: string },
): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/api/storages')
    .set('Authorization', `Bearer ${token}`)
    .send(payload);
  return (res.body as CreateStorageResponse).storageUUID;
}

async function archiveStorage(app: INestApplication, token: string, uuid: string): Promise<void> {
  await request(app.getHttpServer())
    .delete(`/api/storages/${uuid}`)
    .set('Authorization', `Bearer ${token}`);
}

// ─── Spec ─────────────────────────────────────────────────────────────────────

describe('Storage CRUD — GET / PATCH / DELETE /api/storages/:uuid (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  const TENANT_A_NAME = 'CRUD E2E Business Alpha';
  const TENANT_B_NAME = 'CRUD E2E Business Beta';
  const OWNER_A_EMAIL = 'crud.e2e.owner.a@example.com';
  const OWNER_A_USERNAME = 'crude2eownera';
  const OWNER_B_EMAIL = 'crud.e2e.owner.b@example.com';
  const OWNER_B_USERNAME = 'crude2eownerb';

  let ownerAToken: string;
  let ownerBToken: string;

  /** Active warehouse owned by tenant A */
  let warehouseUUID: string;
  /** Second active storage (STORE_ROOM) owned by tenant A — used for duplicate-name tests */
  let storeRoomUUID: string;
  /** Storage archived during setup — used for archive/update-on-archived tests */
  let archivedCustomRoomUUID: string;
  /** Active storage owned by tenant B — used for tenant isolation tests */
  let tenantBStorageUUID: string;

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

    await setTenantToStarter(dataSource, TENANT_A_NAME);
    ownerAToken = await signIn(app, OWNER_A_EMAIL);

    warehouseUUID = await createStorage(app, ownerAToken, {
      type: 'WAREHOUSE',
      name: 'CRUD Warehouse Alpha',
      address: 'Av. Industrial 200, CDMX',
    });

    storeRoomUUID = await createStorage(app, ownerAToken, {
      type: 'STORE_ROOM',
      name: 'CRUD Store Room Beta',
    });

    archivedCustomRoomUUID = await createStorage(app, ownerAToken, {
      type: 'CUSTOM_ROOM',
      name: 'CRUD Archived Room',
      roomType: 'Archive',
    });
    await archiveStorage(app, ownerAToken, archivedCustomRoomUUID);

    // ── Tenant B setup (for isolation tests) ────────────────────────────────
    await signUp(app, dataSource, OWNER_B_EMAIL, OWNER_B_USERNAME);
    const tempTokenB = await signIn(app, OWNER_B_EMAIL);
    await completeOnboarding(app, tempTokenB, TENANT_B_NAME);
    ownerBToken = await signIn(app, OWNER_B_EMAIL);
    await setTenantToStarter(dataSource, TENANT_B_NAME);
    ownerBToken = await signIn(app, OWNER_B_EMAIL);

    tenantBStorageUUID = await createStorage(app, ownerBToken, {
      type: 'STORE_ROOM',
      name: 'CRUD Tenant B Storage',
    });
  });

  afterAll(async () => {
    await truncateStorageWorkerTables(dataSource);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DELETE /api/storages/:uuid (Archive — not found)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('DELETE /api/storages/:uuid — non-existent', () => {
    describe('Given a non-existent storage UUID', () => {
      describe('When DELETE /api/storages/:uuid is called', () => {
        it('Then it returns 404 (StorageNotFoundError)', async () => {
          const fakeUUID = '00000000-0000-0000-0000-000000000000';
          const res = await request(app.getHttpServer())
            .delete(`/api/storages/${fakeUUID}`)
            .set('Authorization', `Bearer ${ownerAToken}`);

          expect(res.status).toBe(HttpStatus.NOT_FOUND);
        });
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PATCH /api/storages/:uuid — non-existent
  // ═══════════════════════════════════════════════════════════════════════════

  describe('PATCH /api/storages/:uuid — non-existent', () => {
    describe('Given a non-existent storage UUID', () => {
      describe('When PATCH /api/storages/:uuid is called', () => {
        it('Then it returns 404 (StorageNotFoundError)', async () => {
          const fakeUUID = '00000000-0000-0000-0000-000000000000';
          const res = await request(app.getHttpServer())
            .patch(`/api/storages/${fakeUUID}`)
            .set('Authorization', `Bearer ${ownerAToken}`)
            .send({ name: 'Does Not Exist' });

          expect(res.status).toBe(HttpStatus.NOT_FOUND);
        });
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GET /api/storages/:uuid
  // ═══════════════════════════════════════════════════════════════════════════

  describe('GET /api/storages/:uuid', () => {
    // ── Scenario 1: successful retrieval ──────────────────────────────────
    describe('Given a tenant with an active warehouse', () => {
      describe('When GET /api/storages/:uuid is called with a valid UUID', () => {
        it('Then it returns 200 with the full StorageOutDto', async () => {
          const res = await request(app.getHttpServer())
            .get(`/api/storages/${warehouseUUID}`)
            .set('Authorization', `Bearer ${ownerAToken}`);

          expect(res.status).toBe(HttpStatus.OK);
          expect(res.body).toMatchObject({
            uuid: warehouseUUID,
            name: 'CRUD Warehouse Alpha',
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

    // ── Scenario 2: non-existent UUID ─────────────────────────────────────
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

    // ── Scenario 3: tenant isolation ──────────────────────────────────────
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

    // ── Scenario 4: unauthenticated ───────────────────────────────────────
    describe('Given an unauthenticated client', () => {
      describe('When GET /api/storages/:uuid is called without a token', () => {
        it('Then it returns 401', async () => {
          const res = await request(app.getHttpServer()).get(`/api/storages/${warehouseUUID}`);

          expect(res.status).toBe(HttpStatus.UNAUTHORIZED);
        });
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PATCH /api/storages/:uuid (Update)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('PATCH /api/storages/:uuid', () => {
    // ── Scenario 5: successful name update ────────────────────────────────
    // BUG: WarehouseMapper.toEntity() does not include `id`, causing TypeORM
    // to INSERT (instead of UPDATE) the child warehouse row on save.
    // Fix: include `id` in WarehouseMapper.toEntity() (and other child mappers).
    describe('Given a tenant with an active warehouse', () => {
      describe('When PATCH /api/storages/:uuid is called with a new name', () => {
        it('Then it returns 200 with { storageUUID } and the name is updated', async () => {
          const patchRes = await request(app.getHttpServer())
            .patch(`/api/storages/${warehouseUUID}`)
            .set('Authorization', `Bearer ${ownerAToken}`)
            .send({ name: 'CRUD Warehouse Renamed' });

          expect(patchRes.status).toBe(HttpStatus.OK);
          expect(patchRes.body).toEqual({ storageUUID: warehouseUUID });

          // Verify the name was actually persisted
          const getRes = await request(app.getHttpServer())
            .get(`/api/storages/${warehouseUUID}`)
            .set('Authorization', `Bearer ${ownerAToken}`);

          expect(getRes.status).toBe(HttpStatus.OK);
          expect(getRes.body.name).toBe('CRUD Warehouse Renamed');
        });
      });
    });

    // ── Scenario 6: duplicate name ────────────────────────────────────────
    describe('Given a tenant with two storages', () => {
      describe('When PATCH is called with a name that already exists on another storage', () => {
        it('Then it returns 409 (StorageNameAlreadyExistsError)', async () => {
          // Rename the warehouse to match the store room's existing name
          const res = await request(app.getHttpServer())
            .patch(`/api/storages/${warehouseUUID}`)
            .set('Authorization', `Bearer ${ownerAToken}`)
            .send({ name: 'CRUD Store Room Beta' });

          expect(res.status).toBe(HttpStatus.CONFLICT);
          expect(res.body.error).toBe('STORAGE_NAME_ALREADY_EXISTS');
        });
      });
    });

    // ── Scenario 7: update archived storage ───────────────────────────────
    // BUG: (1) Same mapper bug as scenario 5 causes 500 on any update with
    // child entities. (2) UpdateStorageHandler does not guard against archived
    // status — even after fixing the mapper, this would return 200 instead of 404.
    // Fix: add `if (storage.isArchived()) return err(new StorageNotFoundError(...))`.
    describe('Given a tenant with an archived storage', () => {
      describe('When PATCH /api/storages/:uuid is called on the archived storage', () => {
        it('Then it returns 404 (archived storages are not updatable)', async () => {
          const res = await request(app.getHttpServer())
            .patch(`/api/storages/${archivedCustomRoomUUID}`)
            .set('Authorization', `Bearer ${ownerAToken}`)
            .send({ name: 'Should Not Update' });

          expect(res.status).toBe(HttpStatus.NOT_FOUND);
        });
      });
    });

    // ── Scenario 8: unauthenticated ───────────────────────────────────────
    describe('Given an unauthenticated client', () => {
      describe('When PATCH /api/storages/:uuid is called without a token', () => {
        it('Then it returns 401', async () => {
          const res = await request(app.getHttpServer())
            .patch(`/api/storages/${warehouseUUID}`)
            .send({ name: 'Hacked Name' });

          expect(res.status).toBe(HttpStatus.UNAUTHORIZED);
        });
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DELETE /api/storages/:uuid (Archive) — additional scenarios
  // ═══════════════════════════════════════════════════════════════════════════

  describe('DELETE /api/storages/:uuid (Archive)', () => {
    // ── Scenario 9: archive then verify via GET ───────────────────────────
    describe('Given a tenant with an active storage', () => {
      let storageToArchiveUUID: string;

      beforeAll(async () => {
        storageToArchiveUUID = await createStorage(app, ownerAToken, {
          type: 'CUSTOM_ROOM',
          name: 'CRUD Room To Archive',
          roomType: 'Temporary',
        });
      });

      it('Then DELETE returns 204 and GET confirms the storage is archived', async () => {
        const deleteRes = await request(app.getHttpServer())
          .delete(`/api/storages/${storageToArchiveUUID}`)
          .set('Authorization', `Bearer ${ownerAToken}`);

        expect(deleteRes.status).toBe(HttpStatus.NO_CONTENT);

        // GET should still return the storage but with archivedAt set
        const getRes = await request(app.getHttpServer())
          .get(`/api/storages/${storageToArchiveUUID}`)
          .set('Authorization', `Bearer ${ownerAToken}`);

        expect(getRes.status).toBe(HttpStatus.OK);
        expect(getRes.body.uuid).toBe(storageToArchiveUUID);
        expect(getRes.body.archivedAt).not.toBeNull();
        expect(getRes.body.status).toBe('ARCHIVED');
      });
    });

    // ── Scenario 10: archive already archived → 409 ──────────────────────
    describe('Given an already archived storage', () => {
      describe('When DELETE /api/storages/:uuid is called again', () => {
        it('Then it returns 409 (StorageAlreadyArchivedError)', async () => {
          const res = await request(app.getHttpServer())
            .delete(`/api/storages/${archivedCustomRoomUUID}`)
            .set('Authorization', `Bearer ${ownerAToken}`);

          expect(res.status).toBe(HttpStatus.CONFLICT);
          expect(res.body.error).toBe('STORAGE_ALREADY_ARCHIVED');
        });
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // POST /api/storages (Create — tier and capacity limit errors)
  // These tests are placed LAST because they fill up capacity limits.
  // ═══════════════════════════════════════════════════════════════════════════

  describe('POST /api/storages — tier limit errors', () => {
    // ── Scenario: WAREHOUSE on FREE tier (canCreateWarehouse = false) ──────
    describe('Given a tenant on FREE tier', () => {
      let freeOwnerToken: string;

      beforeAll(async () => {
        const FREE_EMAIL = 'crud.e2e.free@example.com';
        const FREE_USERNAME = 'crude2efree';
        await signUp(app, dataSource, FREE_EMAIL, FREE_USERNAME);
        const tempToken = await signIn(app, FREE_EMAIL);
        await completeOnboarding(app, tempToken, 'CRUD Free Tier Biz');
        freeOwnerToken = await signIn(app, FREE_EMAIL);
        // Don't upgrade — stays on FREE
      });

      describe('When POST /api/storages is called with type=WAREHOUSE', () => {
        it('Then it returns 403 because warehouses require STARTER tier or above', async () => {
          const res = await request(app.getHttpServer())
            .post('/api/storages')
            .set('Authorization', `Bearer ${freeOwnerToken}`)
            .send({ type: 'WAREHOUSE', name: 'Free Warehouse', address: 'Some Addr' });

          expect(res.status).toBe(HttpStatus.FORBIDDEN);
        });
      });
    });

    // ── Scenario: WAREHOUSE limit exceeded on STARTER ─────────────────────
    describe('Given a tenant on STARTER tier with max_warehouses=3 and 3 existing warehouses', () => {
      describe('When POST /api/storages is called to create a 4th WAREHOUSE', () => {
        it('Then it returns 403 (WarehouseRequiresTierUpgradeError)', async () => {
          // Create 2 more warehouses to hit the limit (already have 1 from setup)
          await createStorage(app, ownerAToken, {
            type: 'WAREHOUSE',
            name: 'CRUD Warehouse Limit 2',
            address: 'Addr 2',
          });
          await createStorage(app, ownerAToken, {
            type: 'WAREHOUSE',
            name: 'CRUD Warehouse Limit 3',
            address: 'Addr 3',
          });

          const res = await request(app.getHttpServer())
            .post('/api/storages')
            .set('Authorization', `Bearer ${ownerAToken}`)
            .send({ type: 'WAREHOUSE', name: 'CRUD Warehouse Over Limit', address: 'Addr 4' });

          expect(res.status).toBe(HttpStatus.FORBIDDEN);
        });
      });
    });

    // ── Scenario: CUSTOM_ROOM limit exceeded ──────────────────────────────
    describe('Given a tenant on STARTER with max_custom_rooms=3 and 3 custom rooms', () => {
      describe('When POST /api/storages is called with type=CUSTOM_ROOM', () => {
        it('Then it returns 403 (CustomRoomLimitReachedError)', async () => {
          // Create custom rooms up to the limit (archived one does not count)
          await createStorage(app, ownerAToken, {
            type: 'CUSTOM_ROOM',
            name: 'CRUD Custom Room 1',
            roomType: 'General',
          });
          await createStorage(app, ownerAToken, {
            type: 'CUSTOM_ROOM',
            name: 'CRUD Custom Room 2',
            roomType: 'General',
          });
          await createStorage(app, ownerAToken, {
            type: 'CUSTOM_ROOM',
            name: 'CRUD Custom Room 3',
            roomType: 'General',
          });

          const res = await request(app.getHttpServer())
            .post('/api/storages')
            .set('Authorization', `Bearer ${ownerAToken}`)
            .send({ type: 'CUSTOM_ROOM', name: 'CRUD Custom Room Over', roomType: 'General' });

          expect(res.status).toBe(HttpStatus.FORBIDDEN);
        });
      });
    });

    // ── Scenario: STORE_ROOM limit exceeded ───────────────────────────────
    describe('Given a tenant on STARTER with max_store_rooms=3 and 3 store rooms', () => {
      describe('When POST /api/storages is called with type=STORE_ROOM', () => {
        it('Then it returns 403 (StoreRoomLimitReachedError)', async () => {
          // Already have 1 from setup, create 2 more
          await createStorage(app, ownerAToken, {
            type: 'STORE_ROOM',
            name: 'CRUD Store Room 2',
          });
          await createStorage(app, ownerAToken, {
            type: 'STORE_ROOM',
            name: 'CRUD Store Room 3',
          });

          const res = await request(app.getHttpServer())
            .post('/api/storages')
            .set('Authorization', `Bearer ${ownerAToken}`)
            .send({ type: 'STORE_ROOM', name: 'CRUD Store Room Over' });

          expect(res.status).toBe(HttpStatus.FORBIDDEN);
        });
      });
    });

    // ── Scenario: duplicate name on create ────────────────────────────────
    describe('Given a tenant with existing storages', () => {
      describe('When POST /api/storages is called with a name that already exists', () => {
        it('Then it returns 409 (StorageNameAlreadyExistsError)', async () => {
          const res = await request(app.getHttpServer())
            .post('/api/storages')
            .set('Authorization', `Bearer ${ownerBToken}`)
            .send({ type: 'STORE_ROOM', name: 'CRUD Tenant B Storage' });

          expect(res.status).toBe(HttpStatus.CONFLICT);
          expect(res.body.error).toBe('STORAGE_NAME_ALREADY_EXISTS');
        });
      });
    });
  });
});

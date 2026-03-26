import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import {
  getPermissionGuardWorkerApp,
  truncatePermissionGuardWorkerTables,
} from '@test/permission-guard-worker-app';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SignInResponse {
  accessToken: string;
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

async function insertMemberWithRole(
  dataSource: DataSource,
  tenantName: string,
  userEmail: string,
  role: string,
): Promise<void> {
  const tenantRows: Array<{ id: number }> = await dataSource.query(
    `SELECT id FROM "tenants"."tenants" WHERE name = $1 LIMIT 1`,
    [tenantName],
  );
  const tenantId = tenantRows[0].id;

  const userRows: Array<{ id: number; uuid: string }> = await dataSource.query(
    `SELECT u.id, u.uuid FROM "identity"."users" u
     JOIN "accounts"."credential_accounts" ca ON ca.account_id = u.id
     WHERE LOWER(ca.email) = LOWER($1)
     LIMIT 1`,
    [userEmail],
  );
  const userId = userRows[0].id;
  const userUUID = userRows[0].uuid;

  await dataSource.query(
    `INSERT INTO "tenants"."tenant_members" (uuid, tenant_id, user_id, user_uuid, role, status)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, 'active')`,
    [tenantId, userId, userUUID, role],
  );
}

async function getTenantId(dataSource: DataSource, tenantName: string): Promise<number> {
  const rows: Array<{ id: number }> = await dataSource.query(
    `SELECT id FROM "tenants"."tenants" WHERE name = $1 LIMIT 1`,
    [tenantName],
  );
  return rows[0].id;
}

async function setTenantTier(
  dataSource: DataSource,
  tenantId: number,
  tier: string,
): Promise<void> {
  await dataSource.query(`UPDATE "tenants"."tenant_config" SET tier = $1 WHERE tenant_id = $2`, [
    tier,
    tenantId,
  ]);
}

async function setStorageCount(
  dataSource: DataSource,
  tenantId: number,
  storageCount: number,
): Promise<void> {
  await dataSource.query(
    `UPDATE "tenants"."tenant_config" SET storage_count = $1 WHERE tenant_id = $2`,
    [storageCount, tenantId],
  );
}

async function blockActionForTier(
  dataSource: DataSource,
  actionKey: string,
  tier: string,
): Promise<void> {
  await dataSource.query(
    `INSERT INTO tiers.tier_action_overrides (tier, action_id, enabled)
     SELECT $1, id, false FROM capabilities.catalog_actions WHERE key = $2`,
    [tier, actionKey],
  );
}

async function unblockActionForTier(
  dataSource: DataSource,
  actionKey: string,
  tier: string,
): Promise<void> {
  await dataSource.query(
    `DELETE FROM tiers.tier_action_overrides
     WHERE tier = $2
       AND action_id = (SELECT id FROM capabilities.catalog_actions WHERE key = $1 LIMIT 1)`,
    [actionKey, tier],
  );
}

function clearRbacCache(rbacApp: INestApplication): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rbacApp.get<any>(INJECTION_TOKENS.RBAC_POLICY_PORT).cache.clear();
}

// ─── Spec ─────────────────────────────────────────────────────────────────────

const TENANT_NAME = 'Permission Guard Test Business';

describe('PermissionGuard — real business endpoint enforcement (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  const OWNER_EMAIL = 'pguard.owner@example.com';
  const OWNER_USERNAME = 'pguardowner';
  const NO_TENANT_EMAIL = 'pguard.notenant@example.com';
  const NO_TENANT_USERNAME = 'pguardnotenant';
  const SALES_REP_EMAIL = 'pguard.salesrep@example.com';
  const SALES_REP_USERNAME = 'pguardsalesrep';
  const VIEWER_EMAIL = 'pguard.viewer@example.com';
  const VIEWER_USERNAME = 'pguardviewer';
  const WAREHOUSE_KEEPER_EMAIL = 'pguard.wkeeper@example.com';
  const WAREHOUSE_KEEPER_USERNAME = 'pguardwkeeper';

  let ownerToken: string;
  let noTenantToken: string;
  let salesRepToken: string;
  let viewerToken: string;
  let warehouseKeeperToken: string;
  let tenantId: number;

  beforeAll(async () => {
    const workerApp = await getPermissionGuardWorkerApp();
    app = workerApp.app;
    dataSource = workerApp.dataSource;

    // Register all test users
    await Promise.all([
      signUp(app, dataSource, OWNER_EMAIL, OWNER_USERNAME),
      signUp(app, dataSource, NO_TENANT_EMAIL, NO_TENANT_USERNAME),
      signUp(app, dataSource, SALES_REP_EMAIL, SALES_REP_USERNAME),
      signUp(app, dataSource, VIEWER_EMAIL, VIEWER_USERNAME),
      signUp(app, dataSource, WAREHOUSE_KEEPER_EMAIL, WAREHOUSE_KEEPER_USERNAME),
    ]);

    // Owner completes onboarding — creates the tenant (starts on FREE tier)
    const tempOwnerToken = await signIn(app, OWNER_EMAIL);
    await request(app.getHttpServer())
      .post('/api/tenant/onboarding/complete')
      .set('Authorization', `Bearer ${tempOwnerToken}`)
      .send({
        name: TENANT_NAME,
        businessType: 'retail',
        country: 'MX',
        timezone: 'America/Mexico_City',
      });

    // Re-sign-in owner to get a token that carries tenantId
    ownerToken = await signIn(app, OWNER_EMAIL);
    noTenantToken = await signIn(app, NO_TENANT_EMAIL);

    // Insert role members directly (bypassing invitation flow)
    tenantId = await getTenantId(dataSource, TENANT_NAME);
    await insertMemberWithRole(dataSource, TENANT_NAME, SALES_REP_EMAIL, 'SALES_REP');
    await insertMemberWithRole(dataSource, TENANT_NAME, VIEWER_EMAIL, 'VIEWER');
    await insertMemberWithRole(dataSource, TENANT_NAME, WAREHOUSE_KEEPER_EMAIL, 'WAREHOUSE_KEEPER');

    salesRepToken = await signIn(app, SALES_REP_EMAIL);
    viewerToken = await signIn(app, VIEWER_EMAIL);
    warehouseKeeperToken = await signIn(app, WAREHOUSE_KEEPER_EMAIL);
  });

  afterAll(async () => {
    await truncatePermissionGuardWorkerTables(dataSource);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // GET /api/storages — requires STORAGE_READ (available from FREE tier)
  // ══════════════════════════════════════════════════════════════════════════

  describe('Given GET /api/storages (STORAGE_READ action, FREE tier threshold)', () => {
    describe('When an unauthenticated client calls the endpoint', () => {
      it('Then PermissionGuard blocks with 401 NOT_AUTHENTICATED before any auth guard runs', async () => {
        const res = await request(app.getHttpServer()).get('/api/storages');

        expect(res.status).toBe(HttpStatus.UNAUTHORIZED);
        expect(res.body.error).toBe('NOT_AUTHENTICATED');
      });
    });

    describe('When a user with no tenant membership calls the endpoint', () => {
      it('Then PermissionGuard blocks with 403 MEMBERSHIP_REQUIRED', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/storages')
          .set('Authorization', `Bearer ${noTenantToken}`);

        expect(res.status).toBe(HttpStatus.FORBIDDEN);
        expect(res.body.error).toBe('MEMBERSHIP_REQUIRED');
      });
    });

    describe('When a SALES_REP (role lacks STORAGE_READ) calls the endpoint', () => {
      it('Then PermissionGuard blocks with 403 ACTION_NOT_ALLOWED', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/storages')
          .set('Authorization', `Bearer ${salesRepToken}`);

        expect(res.status).toBe(HttpStatus.FORBIDDEN);
        expect(res.body.error).toBe('ACTION_NOT_ALLOWED');
      });
    });

    describe('When a VIEWER (role has STORAGE_READ, FREE tier qualifies) calls the endpoint', () => {
      it('Then PermissionGuard passes and the endpoint returns 200', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/storages')
          .set('Authorization', `Bearer ${viewerToken}`);

        expect(res.status).toBe(HttpStatus.OK);
        expect(Array.isArray(res.body)).toBe(true);
      });
    });

    describe('When an OWNER (role has STORAGE_READ, FREE tier qualifies) calls the endpoint', () => {
      it('Then PermissionGuard passes and the endpoint returns 200', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/storages')
          .set('Authorization', `Bearer ${ownerToken}`);

        expect(res.status).toBe(HttpStatus.OK);
        expect(Array.isArray(res.body)).toBe(true);
      });
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // POST /api/storages — requires STORAGE_CREATE (STARTER tier required)
  // ══════════════════════════════════════════════════════════════════════════

  describe('Given POST /api/storages (STORAGE_CREATE action, STARTER tier threshold)', () => {
    const validStorageBody = { type: 'STORE_ROOM', name: 'Test Storage Room' };

    describe('When the tenant is on FREE tier', () => {
      describe('When an OWNER tries to create a storage', () => {
        it('Then PermissionGuard blocks with 403 TIER_LIMIT_REACHED (FREE tier storage cap is 0)', async () => {
          const res = await request(app.getHttpServer())
            .post('/api/storages')
            .set('Authorization', `Bearer ${ownerToken}`)
            .send(validStorageBody);

          expect(res.status).toBe(HttpStatus.FORBIDDEN);
          expect(res.body.error).toBe('TIER_LIMIT_REACHED');
        });
      });
    });

    describe('When the tenant tier is upgraded to STARTER', () => {
      beforeAll(async () => {
        await setTenantTier(dataSource, tenantId, 'STARTER');
      });

      describe('When a WAREHOUSE_KEEPER (role lacks STORAGE_CREATE) tries to create a storage', () => {
        it('Then PermissionGuard blocks with 403 ACTION_NOT_ALLOWED', async () => {
          const res = await request(app.getHttpServer())
            .post('/api/storages')
            .set('Authorization', `Bearer ${warehouseKeeperToken}`)
            .send(validStorageBody);

          expect(res.status).toBe(HttpStatus.FORBIDDEN);
          expect(res.body.error).toBe('ACTION_NOT_ALLOWED');
        });
      });

      describe('When the STARTER storage limit is fully consumed (3 out of 3)', () => {
        beforeAll(async () => {
          // Simulate tenant having reached the STARTER storage limit
          await setStorageCount(dataSource, tenantId, 3);
        });

        describe('When an OWNER (role has STORAGE_CREATE) tries to create another storage', () => {
          it('Then PermissionGuard blocks with 403 TIER_LIMIT_REACHED', async () => {
            const res = await request(app.getHttpServer())
              .post('/api/storages')
              .set('Authorization', `Bearer ${ownerToken}`)
              .send(validStorageBody);

            expect(res.status).toBe(HttpStatus.FORBIDDEN);
            expect(res.body.error).toBe('TIER_LIMIT_REACHED');
          });
        });
      });

      describe('When the OWNER has capacity (below the STARTER limit)', () => {
        beforeAll(async () => {
          // Reset storage count so the OWNER is below the STARTER limit
          await setStorageCount(dataSource, tenantId, 0);
        });

        describe('When the OWNER sends a valid create storage request', () => {
          it('Then PermissionGuard passes and the storage is created successfully', async () => {
            const res = await request(app.getHttpServer())
              .post('/api/storages')
              .set('Authorization', `Bearer ${ownerToken}`)
              .send(validStorageBody);

            // Guard passed — handler ran and created the storage
            expect(res.status).toBe(HttpStatus.CREATED);
            expect(res.body).toMatchObject({ storageUUID: expect.any(String) });
          });
        });
      });
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // FEATURE_NOT_IN_TIER — actions gated by tier, regardless of role
  // ══════════════════════════════════════════════════════════════════════════

  describe('Given POST /api/tenant/me/invitations (MEMBER_INVITE) requires STARTER tier', () => {
    const INVITEE_EMAIL = 'tier.invitee@example.com';

    beforeAll(async () => {
      // Seed: MEMBER_INVITE is disabled on FREE — product rule: invitations require STARTER+
      await blockActionForTier(dataSource, 'MEMBER_INVITE', 'FREE');
      await setTenantTier(dataSource, tenantId, 'FREE');
      clearRbacCache(app);
    });

    afterAll(async () => {
      await unblockActionForTier(dataSource, 'MEMBER_INVITE', 'FREE');
      clearRbacCache(app);
    });

    describe('When the tenant is on FREE tier', () => {
      describe('When an OWNER (role has MEMBER_INVITE) tries to invite a member', () => {
        it('Then PermissionGuard blocks with 403 FEATURE_NOT_IN_TIER', async () => {
          const res = await request(app.getHttpServer())
            .post('/api/tenant/me/invitations')
            .set('Authorization', `Bearer ${ownerToken}`)
            .send({ email: INVITEE_EMAIL, role: 'VIEWER' });

          expect(res.status).toBe(HttpStatus.FORBIDDEN);
          expect(res.body.error).toBe('FEATURE_NOT_IN_TIER');
        });
      });

      describe('When a VIEWER (role lacks MEMBER_INVITE) tries to invite a member', () => {
        it('Then PermissionGuard blocks with 403 FEATURE_NOT_IN_TIER (tier check precedes role check)', async () => {
          // Important: even though VIEWER lacks MEMBER_INVITE, the tier block fires first.
          // This verifies the evaluation order: tier → role → usage.
          const res = await request(app.getHttpServer())
            .post('/api/tenant/me/invitations')
            .set('Authorization', `Bearer ${viewerToken}`)
            .send({ email: INVITEE_EMAIL, role: 'VIEWER' });

          expect(res.status).toBe(HttpStatus.FORBIDDEN);
          expect(res.body.error).toBe('FEATURE_NOT_IN_TIER');
        });
      });
    });

    describe('When the tenant tier is upgraded to STARTER', () => {
      beforeAll(async () => {
        await setTenantTier(dataSource, tenantId, 'STARTER');
        clearRbacCache(app);
      });

      describe('When an OWNER (role has MEMBER_INVITE, below the member limit) invites a member', () => {
        it('Then PermissionGuard passes and the invitation is created', async () => {
          const res = await request(app.getHttpServer())
            .post('/api/tenant/me/invitations')
            .set('Authorization', `Bearer ${ownerToken}`)
            .send({ email: INVITEE_EMAIL, role: 'VIEWER' });

          // Guard passed — handler ran and created the invitation
          expect(res.status).toBe(HttpStatus.CREATED);
          expect(res.body).toMatchObject({ email: INVITEE_EMAIL });
        });
      });

      describe('When a VIEWER (role lacks MEMBER_INVITE) tries to invite on an unlocked tier', () => {
        it('Then PermissionGuard blocks with 403 ACTION_NOT_ALLOWED (tier passes, role fails)', async () => {
          const res = await request(app.getHttpServer())
            .post('/api/tenant/me/invitations')
            .set('Authorization', `Bearer ${viewerToken}`)
            .send({ email: 'another.invitee@example.com', role: 'VIEWER' });

          expect(res.status).toBe(HttpStatus.FORBIDDEN);
          expect(res.body.error).toBe('ACTION_NOT_ALLOWED');
        });
      });
    });
  });

  describe('Given POST /api/storages (STORAGE_CREATE) requires GROWTH tier', () => {
    const validBody = { type: 'STORE_ROOM', name: 'Growth-tier Storage' };

    beforeAll(async () => {
      // Seed: STORAGE_CREATE disabled on FREE and STARTER — requires GROWTH+
      await blockActionForTier(dataSource, 'STORAGE_CREATE', 'FREE');
      await blockActionForTier(dataSource, 'STORAGE_CREATE', 'STARTER');
      clearRbacCache(app);
    });

    afterAll(async () => {
      await unblockActionForTier(dataSource, 'STORAGE_CREATE', 'FREE');
      await unblockActionForTier(dataSource, 'STORAGE_CREATE', 'STARTER');
      clearRbacCache(app);
    });

    describe('When the tenant is on FREE tier', () => {
      beforeAll(async () => {
        await setTenantTier(dataSource, tenantId, 'FREE');
        clearRbacCache(app);
      });

      describe('When an OWNER (role has STORAGE_CREATE) tries to create a storage', () => {
        it('Then PermissionGuard blocks with 403 FEATURE_NOT_IN_TIER', async () => {
          const res = await request(app.getHttpServer())
            .post('/api/storages')
            .set('Authorization', `Bearer ${ownerToken}`)
            .send(validBody);

          expect(res.status).toBe(HttpStatus.FORBIDDEN);
          expect(res.body.error).toBe('FEATURE_NOT_IN_TIER');
        });
      });
    });

    describe('When the tenant is on STARTER tier', () => {
      beforeAll(async () => {
        await setTenantTier(dataSource, tenantId, 'STARTER');
        clearRbacCache(app);
      });

      describe('When an OWNER (role has STORAGE_CREATE) tries to create a storage', () => {
        it('Then PermissionGuard still blocks with 403 FEATURE_NOT_IN_TIER (STARTER is also below GROWTH)', async () => {
          const res = await request(app.getHttpServer())
            .post('/api/storages')
            .set('Authorization', `Bearer ${ownerToken}`)
            .send(validBody);

          expect(res.status).toBe(HttpStatus.FORBIDDEN);
          expect(res.body.error).toBe('FEATURE_NOT_IN_TIER');
        });
      });
    });

    describe('When the tenant is upgraded to GROWTH tier', () => {
      beforeAll(async () => {
        // Purge existing storages so the handler's per-type count starts at zero.
        // The previous "OWNER sends a valid create storage request" test left one
        // STORE_ROOM, and tenant_config.max_store_rooms defaults to 1 — without
        // clearing it the handler would return STORE_ROOM_LIMIT_REACHED even though
        // PermissionGuard correctly passes.
        await dataSource.query(
          `TRUNCATE TABLE "storage"."custom_rooms", "storage"."store_rooms", "storage"."warehouses", "storage"."storages" RESTART IDENTITY CASCADE`,
        );
        await setTenantTier(dataSource, tenantId, 'GROWTH');
        await setStorageCount(dataSource, tenantId, 0);
        clearRbacCache(app);
      });

      describe('When an OWNER (role has STORAGE_CREATE, below GROWTH limit) creates a storage', () => {
        it('Then PermissionGuard passes and the storage is created', async () => {
          const res = await request(app.getHttpServer())
            .post('/api/storages')
            .set('Authorization', `Bearer ${ownerToken}`)
            .send(validBody);

          expect(res.status).toBe(HttpStatus.CREATED);
          expect(res.body).toMatchObject({ storageUUID: expect.any(String) });
        });
      });
    });
  });
});

import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { getTenantWorkerApp, truncateTenantWorkerTables } from '@test/tenant-worker-app';

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

// ─── Spec ─────────────────────────────────────────────────────────────────────

describe('POST /api/tenant/me/invitations (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  const OWNER_EMAIL = 'postinv.owner.e2e@example.com';
  const OWNER_USERNAME = 'postinvownere2e';
  const INVITEE_EMAIL = 'postinv.invitee.e2e@example.com';
  const INVITEE_USERNAME = 'postinvinviteee2e';

  let ownerToken: string;

  beforeAll(async () => {
    const workerApp = await getTenantWorkerApp();
    app = workerApp.app;
    dataSource = workerApp.dataSource;
    await truncateTenantWorkerTables(dataSource);

    await signUp(app, dataSource, OWNER_EMAIL, OWNER_USERNAME);
    await signUp(app, dataSource, INVITEE_EMAIL, INVITEE_USERNAME);

    ownerToken = await signIn(app, OWNER_EMAIL);

    await request(app.getHttpServer())
      .post('/api/tenant/onboarding/complete')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'PostInvitation Test Business',
        businessType: 'retail',
        country: 'MX',
        timezone: 'America/Mexico_City',
      });

    ownerToken = await signIn(app, OWNER_EMAIL);

    await dataSource.query(
      `
      UPDATE "tenants"."tenant_config" tc
      SET tier = 'STARTER', max_users = 5
      FROM "tenants"."tenant_members" tm
        JOIN "identity"."users" u ON u.id = tm.user_id
        JOIN "accounts"."credential_accounts" ca ON ca.account_id = u.id
      WHERE tm.tenant_id = tc.tenant_id
        AND tm.role = 'OWNER'
        AND tm.archived_at IS NULL
        AND LOWER(ca.email) = LOWER($1)
    `,
      [OWNER_EMAIL],
    );

    ownerToken = await signIn(app, OWNER_EMAIL);
  });

  afterAll(async () => {
    await truncateTenantWorkerTables(dataSource);
  });

  describe('Given an owner with STARTER tier inviting a new member', () => {
    describe('When they post a valid invitation', () => {
      it('Then it returns 201 with invitation details', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/tenant/me/invitations')
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ email: INVITEE_EMAIL, role: 'VIEWER' });

        expect(res.status).toBe(HttpStatus.CREATED);
        expect(res.body.id).toBeDefined();
        expect(res.body.email).toBe(INVITEE_EMAIL);
        expect(res.body.role).toBe('VIEWER');
        expect(res.body.expiresAt).toBeDefined();
      });
    });

    describe('When they send a duplicate invitation for the same pending email', () => {
      it('Then it returns 409 InvitationAlreadyPending', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/tenant/me/invitations')
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ email: INVITEE_EMAIL, role: 'VIEWER' });

        expect(res.status).toBe(HttpStatus.CONFLICT);
      });
    });
  });

  describe('Given a VIEWER trying to invite a member', () => {
    let viewerToken: string;

    beforeAll(async () => {
      const VIEWER_EMAIL = 'postinv.viewer@example.com';
      const VIEWER_USERNAME = 'postinvviewere2e';

      await signUp(app, dataSource, VIEWER_EMAIL, VIEWER_USERNAME);

      const tenantRows: Array<{ id: number }> = await dataSource.query(
        `SELECT id FROM "tenants"."tenants" WHERE name = 'PostInvitation Test Business' LIMIT 1`,
      );
      const tenantId = tenantRows[0].id;

      const userRows: Array<{ id: number; uuid: string }> = await dataSource.query(
        `SELECT u.id, u.uuid FROM "identity"."users" u
         JOIN "accounts"."credential_accounts" ca ON ca.account_id = u.id
         WHERE LOWER(ca.email) = LOWER($1) LIMIT 1`,
        [VIEWER_EMAIL],
      );

      await dataSource.query(
        `INSERT INTO "tenants"."tenant_members" (uuid, tenant_id, user_id, user_uuid, role, status)
         VALUES (gen_random_uuid(), $1, $2, $3, 'VIEWER', 'active')`,
        [tenantId, userRows[0].id, userRows[0].uuid],
      );

      viewerToken = await signIn(app, VIEWER_EMAIL);
    });

    describe('When a VIEWER tries to invite someone as VIEWER', () => {
      it('Then it returns 403 because VIEWERs cannot invite (InsufficientPermissionsError)', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/tenant/me/invitations')
          .set('Authorization', `Bearer ${viewerToken}`)
          .send({ email: 'viewer.target@example.com', role: 'VIEWER' });

        expect(res.status).toBe(HttpStatus.FORBIDDEN);
      });
    });
  });

  describe('Given an OWNER trying to invite someone with a role above their delegation rules', () => {
    describe('When the OWNER sends an invitation with role OWNER (which OWNER cannot delegate)', () => {
      it('Then it returns 403 InsufficientPermissions because OWNER is not in the delegation rules', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/tenant/me/invitations')
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ email: 'undelegable.target@example.com', role: 'OWNER' });

        expect(res.status).toBe(HttpStatus.FORBIDDEN);
      });
    });
  });
});

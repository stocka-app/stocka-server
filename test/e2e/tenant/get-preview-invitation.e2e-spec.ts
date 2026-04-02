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

describe('GET /api/tenant/invitations/:token (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  const OWNER_EMAIL = 'previewinv.owner.e2e@example.com';
  const OWNER_USERNAME = 'previewinvownere2e';
  const INVITEE_EMAIL = 'previewinv.invitee.e2e@example.com';
  const INVITEE_USERNAME = 'previewinvinviteee2e';
  const TENANT_NAME = 'PreviewInvitation Test Business';

  let ownerToken: string;
  let inviteeToken: string;
  let validInvitationToken: string;
  let acceptedInvitationToken: string;

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
        name: TENANT_NAME,
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
    inviteeToken = await signIn(app, INVITEE_EMAIL);

    // Create a valid pending invitation
    const validCreateRes = await request(app.getHttpServer())
      .post('/api/tenant/me/invitations')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ email: INVITEE_EMAIL, role: 'VIEWER' });

    const validInvId = (validCreateRes.body as { id: string }).id;
    const validRows = await dataSource.query<{ token: string }[]>(
      `SELECT token FROM "tenants"."tenant_invitations" WHERE id = $1`,
      [validInvId],
    );
    validInvitationToken = validRows[0].token;

    // Accept it so we have an already-accepted token
    await request(app.getHttpServer())
      .post(`/api/tenant/invitations/${validInvitationToken}/accept`)
      .set('Authorization', `Bearer ${inviteeToken}`);

    acceptedInvitationToken = validInvitationToken;
  });

  afterAll(async () => {
    await truncateTenantWorkerTables(dataSource);
  });

  describe('Given a valid invitation token for a pending invitation', () => {
    let freshInvToken: string;

    beforeAll(async () => {
      const freshEmail = 'previewinv.fresh@example.com';
      const freshCreateRes = await request(app.getHttpServer())
        .post('/api/tenant/me/invitations')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ email: freshEmail, role: 'VIEWER' });

      const freshId = (freshCreateRes.body as { id: string }).id;
      const rows = await dataSource.query<{ token: string }[]>(
        `SELECT token FROM "tenants"."tenant_invitations" WHERE id = $1`,
        [freshId],
      );
      freshInvToken = rows[0].token;
    });

    describe('When a user previews the invitation before accepting', () => {
      it('Then it returns 200 with invitation details (no auth required)', async () => {
        const res = await request(app.getHttpServer()).get(
          `/api/tenant/invitations/${freshInvToken}`,
        );

        expect(res.status).toBe(HttpStatus.OK);
        expect(res.body.email).toBe('previewinv.fresh@example.com');
        expect(res.body.tenantName).toBe(TENANT_NAME);
      });
    });
  });

  describe('Given an unknown invitation token', () => {
    describe('When a user tries to preview the invitation', () => {
      it('Then it returns 404 Not Found', async () => {
        const res = await request(app.getHttpServer()).get(
          '/api/tenant/invitations/nonexistenttoken123',
        );

        expect(res.status).toBe(HttpStatus.NOT_FOUND);
      });
    });
  });

  describe('Given an expired invitation token', () => {
    let expiredPreviewToken: string;

    beforeAll(async () => {
      const previewExpEmail = 'previewinv.expired@example.com';

      const createRes = await request(app.getHttpServer())
        .post('/api/tenant/me/invitations')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ email: previewExpEmail, role: 'VIEWER' });

      const previewId = (createRes.body as { id: string }).id;

      const rows = await dataSource.query<{ token: string }[]>(
        `SELECT token FROM "tenants"."tenant_invitations" WHERE id = $1`,
        [previewId],
      );
      expiredPreviewToken = rows[0].token;

      await dataSource.query(
        `UPDATE "tenants"."tenant_invitations"
         SET expires_at = NOW() - INTERVAL '1 day'
         WHERE token = $1`,
        [expiredPreviewToken],
      );
    });

    describe('When the expired token is previewed via GET', () => {
      it('Then it returns 410 Gone (INVITATION_EXPIRED)', async () => {
        const res = await request(app.getHttpServer()).get(
          `/api/tenant/invitations/${expiredPreviewToken}`,
        );

        expect(res.status).toBe(HttpStatus.GONE);
      });
    });
  });

  describe('Given an already-accepted invitation token', () => {
    describe('When the accepted token is previewed via GET', () => {
      it('Then it returns 409 Conflict (INVITATION_ALREADY_USED)', async () => {
        const res = await request(app.getHttpServer()).get(
          `/api/tenant/invitations/${acceptedInvitationToken}`,
        );

        expect(res.status).toBe(HttpStatus.CONFLICT);
      });
    });
  });
});

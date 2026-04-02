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

describe('DELETE /api/tenant/me/invitations/:id (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  const OWNER_EMAIL = 'cancelinv.owner.e2e@example.com';
  const OWNER_USERNAME = 'cancelinvownere2e';
  const INVITEE_EMAIL = 'cancelinv.invitee.e2e@example.com';
  const INVITEE_USERNAME = 'cancelinvinviteee2e';

  let ownerToken: string;
  let inviteeToken: string;
  let acceptedInvitationId: string;
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
        name: 'CancelInvitation Test Business',
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

    // Create and accept an invitation to test cancellation of already-accepted
    const createRes = await request(app.getHttpServer())
      .post('/api/tenant/me/invitations')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ email: INVITEE_EMAIL, role: 'VIEWER' });

    acceptedInvitationId = (createRes.body as { id: string }).id;

    const rows = await dataSource.query<{ token: string }[]>(
      `SELECT token FROM "tenants"."tenant_invitations" WHERE id = $1`,
      [acceptedInvitationId],
    );
    acceptedInvitationToken = rows[0].token;

    await request(app.getHttpServer())
      .post(`/api/tenant/invitations/${acceptedInvitationToken}/accept`)
      .set('Authorization', `Bearer ${inviteeToken}`);
  });

  afterAll(async () => {
    await truncateTenantWorkerTables(dataSource);
  });

  describe('Given an owner who wants to cancel a pending invitation', () => {
    let cancelInvitationId: string;
    let cancelInvitationToken: string;

    beforeAll(async () => {
      const cancelEmail = 'cancelinv.target.e2e@example.com';
      await signUp(app, dataSource, cancelEmail, 'cancelinvtargete2e');

      const createRes = await request(app.getHttpServer())
        .post('/api/tenant/me/invitations')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ email: cancelEmail, role: 'VIEWER' });

      cancelInvitationId = (createRes.body as { id: string }).id;
      cancelInvitationToken = (createRes.body as { token: string }).token;

      if (!cancelInvitationToken) {
        const rows = await dataSource.query<{ token: string }[]>(
          `SELECT token FROM "tenants"."tenant_invitations" WHERE id = $1`,
          [cancelInvitationId],
        );
        cancelInvitationToken = rows[0]?.token ?? '';
      }
    });

    describe('When they cancel the invitation', () => {
      it('Then it returns 204 No Content', async () => {
        const res = await request(app.getHttpServer())
          .delete(`/api/tenant/me/invitations/${cancelInvitationId}`)
          .set('Authorization', `Bearer ${ownerToken}`);

        expect(res.status).toBe(HttpStatus.NO_CONTENT);
      });
    });

    describe('When the cancelled invitation token is previewed', () => {
      it('Then it returns 404 Not Found', async () => {
        const res = await request(app.getHttpServer()).get(
          `/api/tenant/invitations/${cancelInvitationToken}`,
        );

        expect(res.status).toBe(HttpStatus.NOT_FOUND);
      });
    });
  });

  describe('Given an owner who tries to cancel a non-existent invitation', () => {
    describe('When they provide an unknown invitation ID', () => {
      it('Then it returns 404 Not Found', async () => {
        const res = await request(app.getHttpServer())
          .delete('/api/tenant/me/invitations/00000000-0000-0000-0000-000000000000')
          .set('Authorization', `Bearer ${ownerToken}`);

        expect(res.status).toBe(HttpStatus.NOT_FOUND);
      });
    });
  });

  describe('Given an owner trying to cancel an already-accepted invitation', () => {
    describe('When they try to cancel the already-accepted invitation', () => {
      it('Then it returns 409 Conflict (INVITATION_ALREADY_USED)', async () => {
        const res = await request(app.getHttpServer())
          .delete(`/api/tenant/me/invitations/${acceptedInvitationId}`)
          .set('Authorization', `Bearer ${ownerToken}`);

        expect(res.status).toBe(HttpStatus.CONFLICT);
      });
    });
  });
});

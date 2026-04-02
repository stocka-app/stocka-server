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

describe('POST /api/tenant/invitations/:token/accept (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  const OWNER_EMAIL = 'acceptinv.owner.e2e@example.com';
  const OWNER_USERNAME = 'acceptinvownere2e';
  const INVITEE_EMAIL = 'acceptinv.invitee.e2e@example.com';
  const INVITEE_USERNAME = 'acceptinvinviteee2e';
  const TENANT_NAME = 'AcceptInvitation Test Business';

  let ownerToken: string;
  let inviteeToken: string;
  let mainInvitationToken: string;
  let mainInvitationId: string;

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

    const createRes = await request(app.getHttpServer())
      .post('/api/tenant/me/invitations')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ email: INVITEE_EMAIL, role: 'VIEWER' });

    mainInvitationId = (createRes.body as { id: string }).id;

    const rows = await dataSource.query<{ token: string }[]>(
      `SELECT token FROM "tenants"."tenant_invitations" WHERE id = $1`,
      [mainInvitationId],
    );
    mainInvitationToken = rows[0].token;
  });

  afterAll(async () => {
    await truncateTenantWorkerTables(dataSource);
  });

  describe('Given the invitee user with a valid pending invitation token', () => {
    describe('When they accept the invitation', () => {
      it('Then it returns 201 with tenantUUID, tenantName, role, and joinedAt', async () => {
        const res = await request(app.getHttpServer())
          .post(`/api/tenant/invitations/${mainInvitationToken}/accept`)
          .set('Authorization', `Bearer ${inviteeToken}`);

        expect(res.status).toBe(HttpStatus.CREATED);
        expect(res.body.tenantName).toBe(TENANT_NAME);
        expect(res.body.role).toBe('VIEWER');
        expect(res.body.joinedAt).toBeDefined();
      });
    });

    describe('When the same token is used a second time', () => {
      it('Then it returns 409 InvitationAlreadyUsed', async () => {
        const res = await request(app.getHttpServer())
          .post(`/api/tenant/invitations/${mainInvitationToken}/accept`)
          .set('Authorization', `Bearer ${inviteeToken}`);

        expect(res.status).toBe(HttpStatus.CONFLICT);
      });
    });
  });

  describe('Given an invitee trying to accept an expired invitation', () => {
    let expiredInvitationToken: string;

    beforeAll(async () => {
      const expEmail = 'acceptinv.expired@example.com';
      const expUsername = 'acceptinvexpired';

      const createRes = await request(app.getHttpServer())
        .post('/api/tenant/me/invitations')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ email: expEmail, role: 'VIEWER' });

      const expInvId = (createRes.body as { id: string }).id;

      const rows = await dataSource.query<{ token: string }[]>(
        `SELECT token FROM "tenants"."tenant_invitations" WHERE id = $1`,
        [expInvId],
      );
      expiredInvitationToken = rows[0].token;

      await dataSource.query(
        `UPDATE "tenants"."tenant_invitations"
         SET expires_at = NOW() - INTERVAL '1 day'
         WHERE token = $1`,
        [expiredInvitationToken],
      );

      await signUp(app, dataSource, expEmail, expUsername);
    });

    describe('When they try to accept the expired invitation', () => {
      it('Then it returns 410 Gone', async () => {
        const expToken = await signIn(app, 'acceptinv.expired@example.com');
        const res = await request(app.getHttpServer())
          .post(`/api/tenant/invitations/${expiredInvitationToken}/accept`)
          .set('Authorization', `Bearer ${expToken}`);

        expect(res.status).toBe(HttpStatus.GONE);
      });
    });
  });

  describe('Given a user trying to accept an invitation meant for someone else', () => {
    let mismatchInvToken: string;

    beforeAll(async () => {
      const targetEmail = 'acceptinv.mismatch.target@example.com';
      const wrongEmail = 'acceptinv.mismatch.wrong@example.com';
      const wrongUsername = 'acceptinvmismatchwrong';

      const createRes = await request(app.getHttpServer())
        .post('/api/tenant/me/invitations')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ email: targetEmail, role: 'VIEWER' });

      const mismatchId = (createRes.body as { id: string }).id;

      const rows = await dataSource.query<{ token: string }[]>(
        `SELECT token FROM "tenants"."tenant_invitations" WHERE id = $1`,
        [mismatchId],
      );
      mismatchInvToken = rows[0].token;

      await signUp(app, dataSource, wrongEmail, wrongUsername);
    });

    describe('When the wrong user tries to accept', () => {
      it('Then it returns 403 Forbidden (INVITATION_EMAIL_MISMATCH)', async () => {
        const wrongToken = await signIn(app, 'acceptinv.mismatch.wrong@example.com');
        const res = await request(app.getHttpServer())
          .post(`/api/tenant/invitations/${mismatchInvToken}/accept`)
          .set('Authorization', `Bearer ${wrongToken}`);

        expect(res.status).toBe(HttpStatus.FORBIDDEN);
        expect(res.body.error).toBe('INVITATION_EMAIL_MISMATCH');
      });
    });
  });

  describe('Given a user trying to accept a non-existent invitation token', () => {
    describe('When they call accept with a bogus token', () => {
      it('Then it returns 404 Not Found', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/tenant/invitations/nonexistenttoken999/accept')
          .set('Authorization', `Bearer ${inviteeToken}`);

        expect(res.status).toBe(HttpStatus.NOT_FOUND);
      });
    });
  });

  describe('Given an invitee who already belongs to the tenant', () => {
    let memberInvToken: string;

    beforeAll(async () => {
      const memberTestEmail = 'acceptinv.member.alreadyexists@example.com';
      const createRes = await request(app.getHttpServer())
        .post('/api/tenant/me/invitations')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ email: memberTestEmail, role: 'VIEWER' });

      const memberId = (createRes.body as { id: string }).id;

      const rows = await dataSource.query<{ token: string }[]>(
        `SELECT token FROM "tenants"."tenant_invitations" WHERE id = $1`,
        [memberId],
      );
      memberInvToken = rows[0].token;

      // Override the invitation email to match the invitee who's already a member
      await dataSource.query(
        `UPDATE "tenants"."tenant_invitations"
         SET email = $1
         WHERE token = $2`,
        [INVITEE_EMAIL, memberInvToken],
      );
    });

    describe('When the already-a-member user tries to accept the invitation', () => {
      it('Then it returns 409 Conflict (MEMBER_ALREADY_EXISTS)', async () => {
        const freshInviteeToken = await signIn(app, INVITEE_EMAIL);
        const res = await request(app.getHttpServer())
          .post(`/api/tenant/invitations/${memberInvToken}/accept`)
          .set('Authorization', `Bearer ${freshInviteeToken}`);

        expect(res.status).toBe(HttpStatus.CONFLICT);
        expect(res.body.error).toBe('MEMBER_ALREADY_EXISTS');
      });
    });
  });
});

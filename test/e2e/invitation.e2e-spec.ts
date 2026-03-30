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

describe('Invitation flow (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  // Owner user (creates the tenant)
  const OWNER_EMAIL = 'owner.invite.e2e@example.com';
  const OWNER_USERNAME = 'ownerinvitee2e';

  // Invitee user (receives and accepts the invitation)
  const INVITEE_EMAIL = 'invitee.e2e@example.com';
  const INVITEE_USERNAME = 'inviteee2e';

  let ownerToken: string;
  let inviteeToken: string;
  let invitationId: string;
  let invitationToken: string;

  beforeAll(async () => {
    const workerApp = await getTenantWorkerApp();
    app = workerApp.app;
    dataSource = workerApp.dataSource;
    await truncateTenantWorkerTables(dataSource);

    // Register and verify both users
    await signUp(app, dataSource, OWNER_EMAIL, OWNER_USERNAME);
    await signUp(app, dataSource, INVITEE_EMAIL, INVITEE_USERNAME);

    // Sign in the owner (tenantId = null initially)
    ownerToken = await signIn(app, OWNER_EMAIL);

    // Create the tenant for the owner
    await request(app.getHttpServer())
      .post('/api/tenant/onboarding/complete')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Test Business e2e',
        businessType: 'retail',
        country: 'MX',
        timezone: 'America/Mexico_City',
      });

    // Re-sign in the owner to get a token that includes tenantId
    ownerToken = await signIn(app, OWNER_EMAIL);

    // Upgrade tenant to STARTER so invite-member action is permitted
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

    // Sign in the invitee (tenantId = null — they have no tenant yet)
    inviteeToken = await signIn(app, INVITEE_EMAIL);
  });

  afterAll(async () => {
    await truncateTenantWorkerTables(dataSource);
  });

  // ── 1. CompleteOnboardingController ─────────────────────────────────────────

  describe('Given a registered user without a tenant', () => {
    describe('When they try to create a second tenant (already completed)', () => {
      it('Then it returns 409 Conflict', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/tenant/onboarding/complete')
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({
            name: 'Duplicate Business',
            businessType: 'retail',
            country: 'MX',
            timezone: 'America/Mexico_City',
          });

        expect(res.status).toBe(HttpStatus.CONFLICT);
      });
    });
  });

  // ── 2. GetMyTenantController ─────────────────────────────────────────────────

  describe('Given an authenticated owner with an active tenant', () => {
    describe('When they request their tenant details', () => {
      it('Then it returns 200 with name and status', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/tenant/me')
          .set('Authorization', `Bearer ${ownerToken}`);

        expect(res.status).toBe(HttpStatus.OK);
        expect(res.body.name).toBe('Test Business e2e');
        expect(res.body.status).toBe('active');
      });
    });
  });

  // ── 3. InviteMemberController ────────────────────────────────────────────────

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

        invitationId = res.body.id as string;
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

  // ── 4. GetInvitationsController ──────────────────────────────────────────────

  describe('Given an owner with at least one pending invitation', () => {
    describe('When they list all invitations for their tenant', () => {
      it('Then it returns 200 with an array containing the invitation', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/tenant/me/invitations')
          .set('Authorization', `Bearer ${ownerToken}`);

        expect(res.status).toBe(HttpStatus.OK);
        expect(Array.isArray(res.body)).toBe(true);
        expect((res.body as { id: string }[]).length).toBeGreaterThan(0);

        const found = (res.body as { id: string; email: string }[]).find(
          (inv) => inv.id === invitationId,
        );
        expect(found).toBeDefined();
        expect(found?.email).toBe(INVITEE_EMAIL);

        // Extract the token for subsequent steps
        const tokenFromList = (res.body as { id: string; token: string }[]).find(
          (inv) => inv.id === invitationId,
        )?.token;
        if (tokenFromList) {
          invitationToken = tokenFromList;
        }
      });
    });
  });

  // ── 5. GetInvitationByTokenController (public) ───────────────────────────────

  describe('Given a valid invitation token', () => {
    describe('When a user previews the invitation before accepting', () => {
      it('Then it returns 200 with invitation details (no auth required)', async () => {
        // Fetch the token from DB if the list endpoint did not expose it
        if (!invitationToken) {
          const rows = await dataSource.query<{ token: string }[]>(
            `SELECT token FROM "tenants"."tenant_invitations" WHERE id = $1`,
            [invitationId],
          );
          invitationToken = rows[0].token;
        }

        const res = await request(app.getHttpServer()).get(
          `/api/tenant/invitations/${invitationToken}`,
        );

        expect(res.status).toBe(HttpStatus.OK);
        expect(res.body.email).toBe(INVITEE_EMAIL);
        expect(res.body.tenantName).toBe('Test Business e2e');
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

  // ── 6. AcceptInvitationController ────────────────────────────────────────────

  describe('Given the invitee user with a valid pending invitation token', () => {
    describe('When they accept the invitation', () => {
      it('Then it returns 201 with tenantUUID, tenantName, role, and joinedAt', async () => {
        // Ensure invitationToken is available
        if (!invitationToken) {
          const rows = await dataSource.query<{ token: string }[]>(
            `SELECT token FROM "tenants"."tenant_invitations" WHERE id = $1`,
            [invitationId],
          );
          invitationToken = rows[0].token;
        }

        const res = await request(app.getHttpServer())
          .post(`/api/tenant/invitations/${invitationToken}/accept`)
          .set('Authorization', `Bearer ${inviteeToken}`);

        expect(res.status).toBe(HttpStatus.CREATED);
        expect(res.body.tenantName).toBe('Test Business e2e');
        expect(res.body.role).toBe('VIEWER');
        expect(res.body.joinedAt).toBeDefined();
      });
    });

    describe('When the same token is used a second time', () => {
      it('Then it returns 409 InvitationAlreadyUsed', async () => {
        const res = await request(app.getHttpServer())
          .post(`/api/tenant/invitations/${invitationToken}/accept`)
          .set('Authorization', `Bearer ${inviteeToken}`);

        expect(res.status).toBe(HttpStatus.CONFLICT);
      });
    });
  });

  // ── 7. CancelInvitationController ────────────────────────────────────────────

  describe('Given an owner who wants to cancel a pending invitation', () => {
    let cancelInvitationId: string;
    let cancelInvitationToken: string;

    beforeAll(async () => {
      // Create a third user and invite them so we can cancel
      const cancelEmail = 'cancel.target.e2e@example.com';
      await signUp(app, dataSource, cancelEmail, 'canceltargete2e');

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

  // ── 8. Error paths ────────────────────────────────────────────────────────────

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

  // ── 9. Accept invitation — expired token ──────────────────────────────────

  describe('Given an invitee trying to accept an expired invitation', () => {
    let expiredInvitationToken: string;

    beforeAll(async () => {
      const expEmail = 'invitee.expired.accept@example.com';
      const expUsername = 'inviteeexpiredaccept';

      // Create invitation and then expire it
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

      // Force-expire
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
        const expToken = await signIn(app, 'invitee.expired.accept@example.com');
        const res = await request(app.getHttpServer())
          .post(`/api/tenant/invitations/${expiredInvitationToken}/accept`)
          .set('Authorization', `Bearer ${expToken}`);

        expect(res.status).toBe(HttpStatus.GONE);
      });
    });
  });

  // ── 10. Accept invitation — email mismatch ────────────────────────────────

  describe('Given a user trying to accept an invitation meant for someone else', () => {
    let mismatchInvToken: string;

    beforeAll(async () => {
      const targetEmail = 'invitee.mismatch.target@example.com';
      const wrongEmail = 'invitee.mismatch.wrong@example.com';
      const wrongUsername = 'inviteemismatchwrong';

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
        const wrongToken = await signIn(app, 'invitee.mismatch.wrong@example.com');
        const res = await request(app.getHttpServer())
          .post(`/api/tenant/invitations/${mismatchInvToken}/accept`)
          .set('Authorization', `Bearer ${wrongToken}`);

        expect(res.status).toBe(HttpStatus.FORBIDDEN);
        expect(res.body.error).toBe('INVITATION_EMAIL_MISMATCH');
      });
    });
  });

  // ── 11. Accept invitation — non-existent token ────────────────────────────

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

  // ── 12. Cancel invitation — already accepted ──────────────────────────────

  describe('Given an owner trying to cancel an already-accepted invitation', () => {
    describe('When they try to cancel the already-accepted invitation', () => {
      it('Then it returns 409 Conflict (INVITATION_ALREADY_USED)', async () => {
        // The invitation from the main flow was already accepted
        const res = await request(app.getHttpServer())
          .delete(`/api/tenant/me/invitations/${invitationId}`)
          .set('Authorization', `Bearer ${ownerToken}`);

        expect(res.status).toBe(HttpStatus.CONFLICT);
      });
    });
  });

  // ── 13. Preview invitation — expired token ────────────────────────────────

  describe('Given an expired invitation token', () => {
    let expiredPreviewToken: string;

    beforeAll(async () => {
      const previewExpEmail = 'preview.expired@example.com';

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

  // ── 14. Preview invitation — already accepted token ───────────────────────

  describe('Given an already-accepted invitation token', () => {
    describe('When the accepted token is previewed via GET', () => {
      it('Then it returns 409 Conflict (INVITATION_ALREADY_USED)', async () => {
        // Use the already-accepted invitationToken from the main flow
        if (!invitationToken) {
          const rows = await dataSource.query<{ token: string }[]>(
            `SELECT token FROM "tenants"."tenant_invitations" WHERE id = $1`,
            [invitationId],
          );
          invitationToken = rows[0].token;
        }

        const res = await request(app.getHttpServer()).get(
          `/api/tenant/invitations/${invitationToken}`,
        );

        expect(res.status).toBe(HttpStatus.CONFLICT);
      });
    });
  });

  // ── 15. Member already exists ─────────────────────────────────────────────

  describe('Given an invitee who already belongs to the tenant', () => {
    let memberInvToken: string;

    beforeAll(async () => {
      // The invitee from the main flow is already a member of this tenant.
      // Create a new invitation for a different email, then change it via DB
      // to point to the invitee's email, so the accept handler sees "member already exists".
      const memberTestEmail = 'member.alreadyexists@example.com';
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
        // Re-sign-in the invitee to get a fresh token
        const freshInviteeToken = await signIn(app, INVITEE_EMAIL);
        const res = await request(app.getHttpServer())
          .post(`/api/tenant/invitations/${memberInvToken}/accept`)
          .set('Authorization', `Bearer ${freshInviteeToken}`);

        expect(res.status).toBe(HttpStatus.CONFLICT);
        expect(res.body.error).toBe('MEMBER_ALREADY_EXISTS');
      });
    });
  });

  // ── 16. Invite with insufficient role permissions ─────────────────────────

  describe('Given a VIEWER trying to invite a member', () => {
    let viewerToken: string;

    beforeAll(async () => {
      const VIEWER_EMAIL = 'inv.viewer@example.com';
      const VIEWER_USERNAME = 'invviewere2e';

      await signUp(app, dataSource, VIEWER_EMAIL, VIEWER_USERNAME);

      // Insert VIEWER member directly
      const tenantRows: Array<{ id: number }> = await dataSource.query(
        `SELECT id FROM "tenants"."tenants" WHERE name = 'Test Business e2e' LIMIT 1`,
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
});

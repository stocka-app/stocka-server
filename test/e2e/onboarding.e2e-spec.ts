import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import {
  getOnboardingWorkerApp,
  truncateOnboardingWorkerTables,
} from '@test/onboarding-worker-app';

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

/**
 * Runs the full CREATE-path onboarding lifecycle for a given user,
 * returning the created tenantId.
 */
async function completeCreateOnboarding(
  app: INestApplication,
  accessToken: string,
  businessName: string,
  businessType: string = 'retail',
): Promise<string> {
  await request(app.getHttpServer())
    .post('/api/onboarding/start')
    .set('Authorization', `Bearer ${accessToken}`);

  await request(app.getHttpServer())
    .patch('/api/onboarding/progress')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ section: 'preferences', data: { locale: 'es', currency: 'MXN' } });

  await request(app.getHttpServer())
    .patch('/api/onboarding/progress')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ section: 'path', data: { path: 'CREATE' } });

  await request(app.getHttpServer())
    .patch('/api/onboarding/progress')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({
      section: 'businessProfile',
      data: {
        name: businessName,
        businessType,
        country: 'MX',
        timezone: 'America/Mexico_City',
      },
    });

  const res = await request(app.getHttpServer())
    .post('/api/onboarding/complete')
    .set('Authorization', `Bearer ${accessToken}`);

  return res.body.tenantId as string;
}

/**
 * Upgrades a tenant (found via owner email) to STARTER tier with proper
 * capacity columns so invitation and storage operations are allowed.
 */
async function setTenantToStarter(dataSource: DataSource, ownerEmail: string): Promise<void> {
  await dataSource.query(
    `UPDATE "tenants"."tenant_config" tc
     SET tier = 'STARTER',
         max_warehouses = 3,
         max_custom_rooms = 3,
         max_store_rooms = 3,
         max_users = 5
     FROM "tenants"."tenant_members" tm
       JOIN "identity"."users" u ON u.id = tm.user_id
       JOIN "accounts"."credential_accounts" ca ON ca.account_id = u.id
     WHERE tm.tenant_id = tc.tenant_id
       AND tm.role = 'OWNER'
       AND tm.archived_at IS NULL
       AND LOWER(ca.email) = LOWER($1)`,
    [ownerEmail],
  );
}

/**
 * Creates an invitation via the tenant API and returns the invitation token.
 */
async function createInvitation(
  app: INestApplication,
  dataSource: DataSource,
  ownerToken: string,
  inviteeEmail: string,
  role: string = 'VIEWER',
): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/api/tenant/me/invitations')
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({ email: inviteeEmail, role });

  expect(res.status).toBe(HttpStatus.CREATED);

  // Token may not be exposed in the response — fall back to DB
  let token = (res.body as { token?: string }).token;
  if (!token) {
    const invitationId = (res.body as { id: string }).id;
    const rows = await dataSource.query<{ token: string }[]>(
      `SELECT token FROM "tenants"."tenant_invitations" WHERE id = $1`,
      [invitationId],
    );
    token = rows[0].token;
  }

  return token;
}

// ─── Spec ─────────────────────────────────────────────────────────────────────

describe('Onboarding — /api/onboarding (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const workerApp = await getOnboardingWorkerApp();
    app = workerApp.app;
    dataSource = workerApp.dataSource;
  });

  afterAll(async () => {
    await truncateOnboardingWorkerTables(dataSource);
  });

  // ── Unauthenticated access ──────────────────────────────────────────────

  describe('Given an unauthenticated request', () => {
    describe('When GET /api/onboarding/status is called without auth', () => {
      it('Then it returns 401 Unauthorized', async () => {
        const res = await request(app.getHttpServer()).get('/api/onboarding/status');

        expect(res.status).toBe(HttpStatus.UNAUTHORIZED);
      });
    });
  });

  // ── Full onboarding lifecycle (CREATE path) ─────────────────────────────

  describe('Given an authenticated user going through the CREATE path', () => {
    const EMAIL = 'onboarding.create@example.com';
    const USERNAME = 'onboardingcreate';
    let accessToken: string;

    beforeAll(async () => {
      await truncateOnboardingWorkerTables(dataSource);
      await signUp(app, dataSource, EMAIL, USERNAME);
      accessToken = await signIn(app, EMAIL);
    });

    // ── GET /api/onboarding/status — no session yet ───────────────────────

    describe('When GET /api/onboarding/status is called with no existing session', () => {
      it('Then it returns 200 with null fields', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/onboarding/status')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(HttpStatus.OK);
        expect(res.body).toMatchObject({
          status: null,
          currentStep: null,
          path: null,
          stepData: null,
        });
      });
    });

    // ── POST /api/onboarding/start ────────────────────────────────────────

    describe('When POST /api/onboarding/start is called', () => {
      it('Then it returns 201 with IN_PROGRESS status and currentStep 0', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/onboarding/start')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(HttpStatus.CREATED);
        expect(res.body).toMatchObject({
          status: 'IN_PROGRESS',
          currentStep: 0,
        });
      });
    });

    // ── POST /api/onboarding/start — idempotent ──────────────────────────

    describe('When POST /api/onboarding/start is called again (idempotent)', () => {
      it('Then it returns 201 with same IN_PROGRESS status (not 409)', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/onboarding/start')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(HttpStatus.CREATED);
        expect(res.body).toMatchObject({
          status: 'IN_PROGRESS',
        });
      });
    });

    // ── PATCH /api/onboarding/progress — save preferences ────────────────

    describe('When PATCH /api/onboarding/progress is called with preferences', () => {
      it('Then it returns 200 with IN_PROGRESS status', async () => {
        const res = await request(app.getHttpServer())
          .patch('/api/onboarding/progress')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ section: 'preferences', data: { locale: 'es', currency: 'MXN' } });

        expect(res.status).toBe(HttpStatus.OK);
        expect(res.body).toMatchObject({
          status: 'IN_PROGRESS',
        });
      });
    });

    // ── PATCH /api/onboarding/progress — save path CREATE ────────────────

    describe('When PATCH /api/onboarding/progress is called with path CREATE', () => {
      it('Then it returns 200 with path CREATE', async () => {
        const res = await request(app.getHttpServer())
          .patch('/api/onboarding/progress')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ section: 'path', data: { path: 'CREATE' } });

        expect(res.status).toBe(HttpStatus.OK);
        expect(res.body).toMatchObject({
          path: 'CREATE',
        });
      });
    });

    // ── PATCH /api/onboarding/progress — save business profile ───────────

    describe('When PATCH /api/onboarding/progress is called with businessProfile', () => {
      it('Then it returns 200', async () => {
        const res = await request(app.getHttpServer())
          .patch('/api/onboarding/progress')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            section: 'businessProfile',
            data: {
              name: 'Test Negocio',
              businessType: 'retail',
              country: 'MX',
              timezone: 'America/Mexico_City',
            },
          });

        expect(res.status).toBe(HttpStatus.OK);
      });
    });

    // ── POST /api/onboarding/complete — CREATE path ──────────────────────

    describe('When POST /api/onboarding/complete is called with all sections saved', () => {
      it('Then it returns 201 with tenant details and OWNER role', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/onboarding/complete')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(HttpStatus.CREATED);
        expect(res.body).toMatchObject({
          path: 'CREATE',
          tenantName: 'Test Negocio',
          role: 'OWNER',
        });
        expect(res.body.tenantId).toBeDefined();
        expect(typeof res.body.tenantId).toBe('string');
      });
    });

    // ── GET /api/onboarding/status — after completion ────────────────────

    describe('When GET /api/onboarding/status is called after completion', () => {
      it('Then it returns 200 with COMPLETED status', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/onboarding/status')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(HttpStatus.OK);
        expect(res.body).toMatchObject({
          status: 'COMPLETED',
        });
      });
    });

    // ── POST /api/onboarding/complete — already completed ────────────────

    describe('When POST /api/onboarding/complete is called again (already completed)', () => {
      it('Then it returns 409 Conflict', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/onboarding/complete')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(HttpStatus.CONFLICT);
      });
    });
  });

  // ── Missing required sections ───────────────────────────────────────────

  describe('Given an authenticated user with incomplete onboarding (CREATE path, no businessProfile)', () => {
    const EMAIL = 'onboarding.incomplete@example.com';
    const USERNAME = 'onboardingincomplete';
    let accessToken: string;

    beforeAll(async () => {
      await truncateOnboardingWorkerTables(dataSource);
      await signUp(app, dataSource, EMAIL, USERNAME);
      accessToken = await signIn(app, EMAIL);

      // Start onboarding
      await request(app.getHttpServer())
        .post('/api/onboarding/start')
        .set('Authorization', `Bearer ${accessToken}`);

      // Set path to CREATE but skip businessProfile
      await request(app.getHttpServer())
        .patch('/api/onboarding/progress')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ section: 'path', data: { path: 'CREATE' } });
    });

    describe('When POST /api/onboarding/complete is called without businessProfile', () => {
      it('Then it returns 422 Unprocessable Entity', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/onboarding/complete')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
      });
    });
  });

  // ── JOIN Path — Happy Flow ────────────────────────────────────────────────

  describe('Given an invitee user going through the JOIN path', () => {
    const OWNER_EMAIL = 'join.owner@example.com';
    const OWNER_USERNAME = 'joinowner';
    const INVITEE_EMAIL = 'join.invitee@example.com';
    const INVITEE_USERNAME = 'joininvitee';
    const TENANT_NAME = 'Join Test Business';

    let ownerTenantId: string;
    let inviteeToken: string;
    let invitationToken: string;

    beforeAll(async () => {
      await truncateOnboardingWorkerTables(dataSource);

      // 1. Owner signs up and completes CREATE onboarding
      await signUp(app, dataSource, OWNER_EMAIL, OWNER_USERNAME);
      let ownerToken = await signIn(app, OWNER_EMAIL);
      ownerTenantId = await completeCreateOnboarding(app, ownerToken, TENANT_NAME);

      // 2. Re-sign-in to get token with tenantId, then upgrade to STARTER
      ownerToken = await signIn(app, OWNER_EMAIL);
      await setTenantToStarter(dataSource, OWNER_EMAIL);
      ownerToken = await signIn(app, OWNER_EMAIL);

      // 3. Owner invites the invitee
      invitationToken = await createInvitation(
        app,
        dataSource,
        ownerToken,
        INVITEE_EMAIL,
        'VIEWER',
      );

      // 4. Invitee signs up and starts onboarding with JOIN path
      await signUp(app, dataSource, INVITEE_EMAIL, INVITEE_USERNAME);
      inviteeToken = await signIn(app, INVITEE_EMAIL);

      await request(app.getHttpServer())
        .post('/api/onboarding/start')
        .set('Authorization', `Bearer ${inviteeToken}`);

      await request(app.getHttpServer())
        .patch('/api/onboarding/progress')
        .set('Authorization', `Bearer ${inviteeToken}`)
        .send({
          section: 'path',
          data: { path: 'JOIN', invitationCode: invitationToken },
        });
    });

    describe('When POST /api/onboarding/complete is called', () => {
      it('Then it returns 201 with path=JOIN, matching tenantId, and VIEWER role', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/onboarding/complete')
          .set('Authorization', `Bearer ${inviteeToken}`);

        expect(res.status).toBe(HttpStatus.CREATED);
        expect(res.body).toMatchObject({
          path: 'JOIN',
          tenantId: ownerTenantId,
          tenantName: TENANT_NAME,
          role: 'VIEWER',
        });
      });
    });

    describe('When GET /api/onboarding/status is called after JOIN completion', () => {
      it('Then it returns 200 with COMPLETED status', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/onboarding/status')
          .set('Authorization', `Bearer ${inviteeToken}`);

        expect(res.status).toBe(HttpStatus.OK);
        expect(res.body).toMatchObject({ status: 'COMPLETED' });
      });
    });
  });

  // ── JOIN Path — Error Cases ───────────────────────────────────────────────

  describe('Given error scenarios for the JOIN path', () => {
    const OWNER_EMAIL = 'join.err.owner@example.com';
    const OWNER_USERNAME = 'joinerrowner';
    const TENANT_NAME = 'Join Error Test Biz';

    let ownerToken: string;

    beforeAll(async () => {
      await truncateOnboardingWorkerTables(dataSource);

      // Setup: owner creates a tenant with STARTER tier
      await signUp(app, dataSource, OWNER_EMAIL, OWNER_USERNAME);
      ownerToken = await signIn(app, OWNER_EMAIL);
      await completeCreateOnboarding(app, ownerToken, TENANT_NAME);
      ownerToken = await signIn(app, OWNER_EMAIL);
      await setTenantToStarter(dataSource, OWNER_EMAIL);
      ownerToken = await signIn(app, OWNER_EMAIL);
    });

    // ── Missing invitation code ──────────────────────────────────────────

    describe('When completing JOIN path without an invitationCode', () => {
      const EMAIL = 'join.nocode@example.com';
      const USERNAME = 'joinnocode';
      let token: string;

      beforeAll(async () => {
        await signUp(app, dataSource, EMAIL, USERNAME);
        token = await signIn(app, EMAIL);

        await request(app.getHttpServer())
          .post('/api/onboarding/start')
          .set('Authorization', `Bearer ${token}`);

        // Save path=JOIN but omit invitationCode
        await request(app.getHttpServer())
          .patch('/api/onboarding/progress')
          .set('Authorization', `Bearer ${token}`)
          .send({ section: 'path', data: { path: 'JOIN' } });
      });

      it('Then it returns 422 Unprocessable Entity (ONBOARDING_INCOMPLETE)', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/onboarding/complete')
          .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
        expect(res.body.error).toBe('ONBOARDING_INCOMPLETE');
      });
    });

    // ── Expired invitation ───────────────────────────────────────────────

    describe('When completing JOIN path with an expired invitation', () => {
      const INVITEE_EMAIL = 'join.expired@example.com';
      const INVITEE_USERNAME = 'joinexpired';
      let token: string;

      beforeAll(async () => {
        // Create invitation, then expire it via DB
        const invToken = await createInvitation(
          app,
          dataSource,
          ownerToken,
          INVITEE_EMAIL,
          'VIEWER',
        );

        // Force-expire the invitation
        await dataSource.query(
          `UPDATE "tenants"."tenant_invitations"
           SET expires_at = NOW() - INTERVAL '1 day'
           WHERE token = $1`,
          [invToken],
        );

        await signUp(app, dataSource, INVITEE_EMAIL, INVITEE_USERNAME);
        token = await signIn(app, INVITEE_EMAIL);

        await request(app.getHttpServer())
          .post('/api/onboarding/start')
          .set('Authorization', `Bearer ${token}`);

        await request(app.getHttpServer())
          .patch('/api/onboarding/progress')
          .set('Authorization', `Bearer ${token}`)
          .send({ section: 'path', data: { path: 'JOIN', invitationCode: invToken } });
      });

      it('Then it returns 410 Gone (INVITATION_EXPIRED)', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/onboarding/complete')
          .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(HttpStatus.GONE);
        expect(res.body.error).toBe('INVITATION_EXPIRED');
      });
    });

    // ── Email mismatch ───────────────────────────────────────────────────

    describe('When completing JOIN path with email mismatch', () => {
      const INVITED_EMAIL = 'join.invited.real@example.com';
      const WRONG_USER_EMAIL = 'join.wronguser@example.com';
      const WRONG_USER_USERNAME = 'joinwronguser';
      let token: string;

      beforeAll(async () => {
        // Invitation is for INVITED_EMAIL, but WRONG_USER_EMAIL will try to use it
        const invToken = await createInvitation(
          app,
          dataSource,
          ownerToken,
          INVITED_EMAIL,
          'VIEWER',
        );

        await signUp(app, dataSource, WRONG_USER_EMAIL, WRONG_USER_USERNAME);
        token = await signIn(app, WRONG_USER_EMAIL);

        await request(app.getHttpServer())
          .post('/api/onboarding/start')
          .set('Authorization', `Bearer ${token}`);

        await request(app.getHttpServer())
          .patch('/api/onboarding/progress')
          .set('Authorization', `Bearer ${token}`)
          .send({ section: 'path', data: { path: 'JOIN', invitationCode: invToken } });
      });

      it('Then it returns 403 Forbidden (INVITATION_EMAIL_MISMATCH)', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/onboarding/complete')
          .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(HttpStatus.FORBIDDEN);
        expect(res.body.error).toBe('INVITATION_EMAIL_MISMATCH');
      });
    });
  });

  // ── Start onboarding after already completed ────────────────────────────

  describe('Given a user who has already completed onboarding (CREATE path)', () => {
    const EMAIL = 'onboarding.start.completed@example.com';
    const USERNAME = 'onboardingstartcompleted';
    let accessToken: string;

    beforeAll(async () => {
      await truncateOnboardingWorkerTables(dataSource);
      await signUp(app, dataSource, EMAIL, USERNAME);
      accessToken = await signIn(app, EMAIL);
      await completeCreateOnboarding(app, accessToken, 'Already Done Biz');
    });

    describe('When POST /api/onboarding/start is called after completion', () => {
      it('Then it returns 409 Conflict (OnboardingAlreadyCompleted)', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/onboarding/start')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(HttpStatus.CONFLICT);
      });
    });
  });

  // ── Save progress on non-existent session ─────────────────────────────────

  describe('Given a user who never started onboarding', () => {
    const EMAIL = 'onboarding.nosession@example.com';
    const USERNAME = 'onboardingnosession';
    let accessToken: string;

    beforeAll(async () => {
      await truncateOnboardingWorkerTables(dataSource);
      await signUp(app, dataSource, EMAIL, USERNAME);
      accessToken = await signIn(app, EMAIL);
    });

    describe('When PATCH /api/onboarding/progress is called without starting first', () => {
      it('Then it returns 404 Not Found (OnboardingNotFound)', async () => {
        const res = await request(app.getHttpServer())
          .patch('/api/onboarding/progress')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ section: 'preferences', data: { locale: 'es', currency: 'MXN' } });

        expect(res.status).toBe(HttpStatus.NOT_FOUND);
      });
    });
  });

  // ── Save progress on completed session ────────────────────────────────────

  describe('Given a user who has already completed onboarding', () => {
    const EMAIL = 'onboarding.save.completed@example.com';
    const USERNAME = 'onboardingsavecompleted';
    let accessToken: string;

    beforeAll(async () => {
      await truncateOnboardingWorkerTables(dataSource);
      await signUp(app, dataSource, EMAIL, USERNAME);
      accessToken = await signIn(app, EMAIL);
      await completeCreateOnboarding(app, accessToken, 'Completed Save Biz');
    });

    describe('When PATCH /api/onboarding/progress is called after completion', () => {
      it('Then it returns 409 Conflict (OnboardingAlreadyCompleted)', async () => {
        const res = await request(app.getHttpServer())
          .patch('/api/onboarding/progress')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ section: 'preferences', data: { locale: 'en', currency: 'USD' } });

        expect(res.status).toBe(HttpStatus.CONFLICT);
      });
    });
  });

  // ── Complete onboarding with no onboarding session (never started) ────────

  describe('Given a user who never started onboarding', () => {
    const EMAIL = 'onboarding.complete.nosession@example.com';
    const USERNAME = 'obcompletenosession';
    let accessToken: string;

    beforeAll(async () => {
      await truncateOnboardingWorkerTables(dataSource);
      await signUp(app, dataSource, EMAIL, USERNAME);
      accessToken = await signIn(app, EMAIL);
    });

    describe('When POST /api/onboarding/complete is called without ever starting', () => {
      it('Then it returns 404 Not Found (OnboardingNotFound)', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/onboarding/complete')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(HttpStatus.NOT_FOUND);
      });
    });
  });

  // ── Complete onboarding with path=null (started but no path selected) ─────

  describe('Given a user who started onboarding but never selected a path', () => {
    const EMAIL = 'onboarding.nopath@example.com';
    const USERNAME = 'onboardingnopath';
    let accessToken: string;

    beforeAll(async () => {
      await truncateOnboardingWorkerTables(dataSource);
      await signUp(app, dataSource, EMAIL, USERNAME);
      accessToken = await signIn(app, EMAIL);

      await request(app.getHttpServer())
        .post('/api/onboarding/start')
        .set('Authorization', `Bearer ${accessToken}`);
    });

    describe('When POST /api/onboarding/complete is called without selecting a path', () => {
      it('Then it returns 422 Unprocessable Entity (ONBOARDING_INCOMPLETE)', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/onboarding/complete')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
        expect(res.body.error).toBe('ONBOARDING_INCOMPLETE');
      });
    });
  });

  // ── JOIN Path — invitation already used ───────────────────────────────────

  describe('Given error scenario: JOIN path with an already-used invitation', () => {
    const OWNER_EMAIL = 'join.used.owner@example.com';
    const OWNER_USERNAME = 'joinusedowner';
    const FIRST_INVITEE_EMAIL = 'join.used.first@example.com';
    const FIRST_INVITEE_USERNAME = 'joinusedfirst';
    const SECOND_INVITEE_EMAIL = 'join.used.second@example.com';
    const SECOND_INVITEE_USERNAME = 'joinusedsecond';

    let secondInviteeToken: string;

    beforeAll(async () => {
      await truncateOnboardingWorkerTables(dataSource);

      // Owner creates tenant
      await signUp(app, dataSource, OWNER_EMAIL, OWNER_USERNAME);
      let ownerToken = await signIn(app, OWNER_EMAIL);
      await completeCreateOnboarding(app, ownerToken, 'Join Used Test Biz');
      ownerToken = await signIn(app, OWNER_EMAIL);
      await setTenantToStarter(dataSource, OWNER_EMAIL);
      ownerToken = await signIn(app, OWNER_EMAIL);

      // Create invitation for first invitee
      const invToken = await createInvitation(
        app,
        dataSource,
        ownerToken,
        FIRST_INVITEE_EMAIL,
        'VIEWER',
      );

      // First invitee accepts the invitation
      await signUp(app, dataSource, FIRST_INVITEE_EMAIL, FIRST_INVITEE_USERNAME);
      const firstInviteeToken = await signIn(app, FIRST_INVITEE_EMAIL);
      await request(app.getHttpServer())
        .post('/api/onboarding/start')
        .set('Authorization', `Bearer ${firstInviteeToken}`);
      await request(app.getHttpServer())
        .patch('/api/onboarding/progress')
        .set('Authorization', `Bearer ${firstInviteeToken}`)
        .send({ section: 'path', data: { path: 'JOIN', invitationCode: invToken } });
      await request(app.getHttpServer())
        .post('/api/onboarding/complete')
        .set('Authorization', `Bearer ${firstInviteeToken}`);

      // Second user tries to use the same already-accepted invitation
      // We manually update the invitation email to match the second user for testing
      await dataSource.query(
        `UPDATE "tenants"."tenant_invitations"
         SET email = $1, accepted_at = NOW()
         WHERE token = $2`,
        [SECOND_INVITEE_EMAIL, invToken],
      );

      await signUp(app, dataSource, SECOND_INVITEE_EMAIL, SECOND_INVITEE_USERNAME);
      secondInviteeToken = await signIn(app, SECOND_INVITEE_EMAIL);
      await request(app.getHttpServer())
        .post('/api/onboarding/start')
        .set('Authorization', `Bearer ${secondInviteeToken}`);
      await request(app.getHttpServer())
        .patch('/api/onboarding/progress')
        .set('Authorization', `Bearer ${secondInviteeToken}`)
        .send({ section: 'path', data: { path: 'JOIN', invitationCode: invToken } });
    });

    describe('When POST /api/onboarding/complete is called with an already-used invitation', () => {
      it('Then it returns 409 Conflict (INVITATION_ALREADY_USED)', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/onboarding/complete')
          .set('Authorization', `Bearer ${secondInviteeToken}`);

        expect(res.status).toBe(HttpStatus.CONFLICT);
        expect(res.body.error).toBe('INVITATION_ALREADY_USED');
      });
    });
  });

  // ── JOIN Path — invitation token not found ────────────────────────────────

  describe('Given error scenario: JOIN path with a non-existent invitation token', () => {
    const EMAIL = 'join.notfound@example.com';
    const USERNAME = 'joinnotfound';
    let token: string;

    beforeAll(async () => {
      await truncateOnboardingWorkerTables(dataSource);
      await signUp(app, dataSource, EMAIL, USERNAME);
      token = await signIn(app, EMAIL);

      await request(app.getHttpServer())
        .post('/api/onboarding/start')
        .set('Authorization', `Bearer ${token}`);

      await request(app.getHttpServer())
        .patch('/api/onboarding/progress')
        .set('Authorization', `Bearer ${token}`)
        .send({
          section: 'path',
          data: { path: 'JOIN', invitationCode: 'nonexistenttoken1234567890' },
        });
    });

    describe('When POST /api/onboarding/complete is called with a bogus invitation token', () => {
      it('Then it returns 404 Not Found (INVITATION_NOT_FOUND)', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/onboarding/complete')
          .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(HttpStatus.NOT_FOUND);
        expect(res.body.error).toBe('INVITATION_NOT_FOUND');
      });
    });
  });

  // ── Different Business Types — defaultStorageName coverage ────────────────

  describe('Given CREATE path with different business types', () => {
    beforeAll(async () => {
      await truncateOnboardingWorkerTables(dataSource);
    });

    describe('When business type is "food"', () => {
      const EMAIL = 'biz.food@example.com';
      const USERNAME = 'bizfood';
      const TENANT_NAME = 'Taqueria La Esquina';
      let accessToken: string;
      let tenantId: string;

      beforeAll(async () => {
        await signUp(app, dataSource, EMAIL, USERNAME);
        accessToken = await signIn(app, EMAIL);
        tenantId = await completeCreateOnboarding(app, accessToken, TENANT_NAME, 'food');
      });

      it('Then it creates the tenant and a default storage named "Cocina / Preparación"', async () => {
        expect(tenantId).toBeDefined();

        const storages = await dataSource.query<{ name: string }[]>(
          `SELECT s.name
           FROM "storage"."storages" s
           WHERE s.tenant_uuid = $1
           AND s.archived_at IS NULL`,
          [tenantId],
        );

        expect(storages).toHaveLength(1);
        expect(storages[0].name).toBe('Cocina / Preparación');
      });
    });

    describe('When business type is "manufacturing"', () => {
      const EMAIL = 'biz.mfg@example.com';
      const USERNAME = 'bizmfg';
      const TENANT_NAME = 'Tornillos y Tuercas SA';
      let accessToken: string;
      let tenantId: string;

      beforeAll(async () => {
        await signUp(app, dataSource, EMAIL, USERNAME);
        accessToken = await signIn(app, EMAIL);
        tenantId = await completeCreateOnboarding(app, accessToken, TENANT_NAME, 'manufacturing');
      });

      it('Then it creates the tenant and a default storage named "Taller Principal"', async () => {
        expect(tenantId).toBeDefined();

        const storages = await dataSource.query<{ name: string }[]>(
          `SELECT s.name
           FROM "storage"."storages" s
           WHERE s.tenant_uuid = $1
           AND s.archived_at IS NULL`,
          [tenantId],
        );

        expect(storages).toHaveLength(1);
        expect(storages[0].name).toBe('Taller Principal');
      });
    });

    describe('When business type is "services" (hits default switch case)', () => {
      const EMAIL = 'biz.services@example.com';
      const USERNAME = 'bizservices';
      const TENANT_NAME = 'Consultoría Moderna';
      let accessToken: string;
      let tenantId: string;

      beforeAll(async () => {
        await signUp(app, dataSource, EMAIL, USERNAME);
        accessToken = await signIn(app, EMAIL);
        tenantId = await completeCreateOnboarding(app, accessToken, TENANT_NAME, 'services');
      });

      it('Then it creates the tenant and a default storage named "Espacio Principal"', async () => {
        expect(tenantId).toBeDefined();

        const storages = await dataSource.query<{ name: string }[]>(
          `SELECT s.name
           FROM "storage"."storages" s
           WHERE s.tenant_uuid = $1
           AND s.archived_at IS NULL`,
          [tenantId],
        );

        expect(storages).toHaveLength(1);
        expect(storages[0].name).toBe('Espacio Principal');
      });
    });
  });
});

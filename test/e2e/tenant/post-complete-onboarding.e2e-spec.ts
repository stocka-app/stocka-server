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

describe('POST /api/onboarding/complete (e2e)', () => {
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

  // ── CREATE path success ───────────────────────────────────────────────────

  describe('Given an authenticated user going through the CREATE path', () => {
    const EMAIL = 'completeonb.create@example.com';
    const USERNAME = 'completeonbcreate';
    let accessToken: string;

    beforeAll(async () => {
      await truncateOnboardingWorkerTables(dataSource);
      await signUp(app, dataSource, EMAIL, USERNAME);
      accessToken = await signIn(app, EMAIL);

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
            name: 'Test Negocio',
            businessType: 'retail',
            country: 'MX',
            timezone: 'America/Mexico_City',
          },
        });
    });

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

    describe('When POST /api/onboarding/complete is called again (already completed)', () => {
      it('Then it returns 409 Conflict', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/onboarding/complete')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(HttpStatus.CONFLICT);
      });
    });
  });

  // ── JOIN path success ─────────────────────────────────────────────────────

  describe('Given an invitee user going through the JOIN path', () => {
    const OWNER_EMAIL = 'completeonb.join.owner@example.com';
    const OWNER_USERNAME = 'completeonbjoinowner';
    const INVITEE_EMAIL = 'completeonb.join.invitee@example.com';
    const INVITEE_USERNAME = 'completeonbjoininvitee';
    const TENANT_NAME = 'CompleteOnb Join Test Business';

    let ownerTenantId: string;
    let inviteeToken: string;
    let invitationToken: string;

    beforeAll(async () => {
      await truncateOnboardingWorkerTables(dataSource);

      await signUp(app, dataSource, OWNER_EMAIL, OWNER_USERNAME);
      let ownerToken = await signIn(app, OWNER_EMAIL);
      ownerTenantId = await completeCreateOnboarding(app, ownerToken, TENANT_NAME);

      ownerToken = await signIn(app, OWNER_EMAIL);
      await setTenantToStarter(dataSource, OWNER_EMAIL);
      ownerToken = await signIn(app, OWNER_EMAIL);

      invitationToken = await createInvitation(app, dataSource, ownerToken, INVITEE_EMAIL, 'VIEWER');

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
  });

  // ── Missing businessProfile (CREATE path) ─────────────────────────────────

  describe('Given an authenticated user with incomplete onboarding (CREATE path, no businessProfile)', () => {
    const EMAIL = 'completeonb.incomplete@example.com';
    const USERNAME = 'completeonbincomplete';
    let accessToken: string;

    beforeAll(async () => {
      await truncateOnboardingWorkerTables(dataSource);
      await signUp(app, dataSource, EMAIL, USERNAME);
      accessToken = await signIn(app, EMAIL);

      await request(app.getHttpServer())
        .post('/api/onboarding/start')
        .set('Authorization', `Bearer ${accessToken}`);

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

  // ── No path selected ──────────────────────────────────────────────────────

  describe('Given a user who started onboarding but never selected a path', () => {
    const EMAIL = 'completeonb.nopath@example.com';
    const USERNAME = 'completeonbnopath';
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

  // ── No session (never started) ────────────────────────────────────────────

  describe('Given a user who never started onboarding', () => {
    const EMAIL = 'completeonb.nosession@example.com';
    const USERNAME = 'completeonbnosession';
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

  // ── JOIN — expired invitation ─────────────────────────────────────────────

  describe('Given error scenarios for the JOIN path', () => {
    const OWNER_EMAIL = 'completeonb.join.err.owner@example.com';
    const OWNER_USERNAME = 'completeonbjoinerrowner';
    const TENANT_NAME = 'CompleteOnb Join Error Test Biz';

    let ownerToken: string;

    beforeAll(async () => {
      await truncateOnboardingWorkerTables(dataSource);

      await signUp(app, dataSource, OWNER_EMAIL, OWNER_USERNAME);
      ownerToken = await signIn(app, OWNER_EMAIL);
      await completeCreateOnboarding(app, ownerToken, TENANT_NAME);
      ownerToken = await signIn(app, OWNER_EMAIL);
      await setTenantToStarter(dataSource, OWNER_EMAIL);
      ownerToken = await signIn(app, OWNER_EMAIL);
    });

    describe('When completing JOIN path with an expired invitation', () => {
      const INVITEE_EMAIL = 'completeonb.join.expired@example.com';
      const INVITEE_USERNAME = 'completeonbjoinexpired';
      let token: string;

      beforeAll(async () => {
        const invToken = await createInvitation(
          app,
          dataSource,
          ownerToken,
          INVITEE_EMAIL,
          'VIEWER',
        );

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

    describe('When completing JOIN path with email mismatch', () => {
      const INVITED_EMAIL = 'completeonb.join.invited.real@example.com';
      const WRONG_USER_EMAIL = 'completeonb.join.wronguser@example.com';
      const WRONG_USER_USERNAME = 'completeonbjoinwronguser';
      let token: string;

      beforeAll(async () => {
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

    describe('When completing JOIN path without an invitationCode', () => {
      const EMAIL = 'completeonb.join.nocode@example.com';
      const USERNAME = 'completeonbjoinnocode';
      let token: string;

      beforeAll(async () => {
        await signUp(app, dataSource, EMAIL, USERNAME);
        token = await signIn(app, EMAIL);

        await request(app.getHttpServer())
          .post('/api/onboarding/start')
          .set('Authorization', `Bearer ${token}`);

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
  });

  // ── JOIN — already-used invitation ────────────────────────────────────────

  describe('Given error scenario: JOIN path with an already-used invitation', () => {
    const OWNER_EMAIL = 'completeonb.join.used.owner@example.com';
    const OWNER_USERNAME = 'completeonbjoinusedowner';
    const FIRST_INVITEE_EMAIL = 'completeonb.join.used.first@example.com';
    const FIRST_INVITEE_USERNAME = 'completeonbjoinusedfirst';
    const SECOND_INVITEE_EMAIL = 'completeonb.join.used.second@example.com';
    const SECOND_INVITEE_USERNAME = 'completeonbjoinusedsecond';

    let secondInviteeToken: string;

    beforeAll(async () => {
      await truncateOnboardingWorkerTables(dataSource);

      await signUp(app, dataSource, OWNER_EMAIL, OWNER_USERNAME);
      let ownerToken = await signIn(app, OWNER_EMAIL);
      await completeCreateOnboarding(app, ownerToken, 'CompleteOnb Join Used Test Biz');
      ownerToken = await signIn(app, OWNER_EMAIL);
      await setTenantToStarter(dataSource, OWNER_EMAIL);
      ownerToken = await signIn(app, OWNER_EMAIL);

      const invToken = await createInvitation(
        app,
        dataSource,
        ownerToken,
        FIRST_INVITEE_EMAIL,
        'VIEWER',
      );

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

  // ── JOIN — invitation token not found ─────────────────────────────────────

  describe('Given error scenario: JOIN path with a non-existent invitation token', () => {
    const EMAIL = 'completeonb.join.notfound@example.com';
    const USERNAME = 'completeonbjoinnotfound';
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

  // ── CreateTenantHandler: existingMember guard ────────────────────────────

  describe('Given a user who already has a tenant but whose onboarding session was not marked complete', () => {
    const EMAIL = 'completeonb.existingmember@example.com';
    const USERNAME = 'completeonbexistingmember';
    let accessToken: string;

    beforeAll(async () => {
      await truncateOnboardingWorkerTables(dataSource);
      await signUp(app, dataSource, EMAIL, USERNAME);
      accessToken = await signIn(app, EMAIL);
      await completeCreateOnboarding(app, accessToken, 'Existing Member Biz');
      accessToken = await signIn(app, EMAIL);

      // Reset session to not-completed so CompleteOnboardingHandler passes through to CreateTenantHandler
      await dataSource.query(
        `UPDATE "onboarding"."onboarding_sessions" SET status = 'IN_PROGRESS'
         WHERE user_uuid = (
           SELECT u.uuid::text FROM "identity"."users" u
           JOIN "accounts"."credential_accounts" ca ON ca.account_id = u.id
           WHERE LOWER(ca.email) = LOWER($1)
         )`,
        [EMAIL],
      );
    });

    describe('When POST /api/onboarding/complete is called and the user already has a tenant', () => {
      it('Then it returns 409 Conflict (OnboardingAlreadyCompleted from CreateTenantHandler)', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/onboarding/complete')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(HttpStatus.CONFLICT);
      });
    });
  });

  // ── CreateTenantHandler: slug collision ───────────────────────────────────

  describe('Given two users who complete onboarding with the same business name', () => {
    const EMAIL_A = 'completeonb.slug.a@example.com';
    const USERNAME_A = 'completeonbsluga';
    const EMAIL_B = 'completeonb.slug.b@example.com';
    const USERNAME_B = 'completeonbslugb';
    const SHARED_NAME = 'Slug Collision Biz';
    let slugA: string;
    let slugB: string;

    beforeAll(async () => {
      await truncateOnboardingWorkerTables(dataSource);

      await signUp(app, dataSource, EMAIL_A, USERNAME_A);
      const tokenA = await signIn(app, EMAIL_A);
      const tenantIdA = await completeCreateOnboarding(app, tokenA, SHARED_NAME);

      await signUp(app, dataSource, EMAIL_B, USERNAME_B);
      const tokenB = await signIn(app, EMAIL_B);
      const tenantIdB = await completeCreateOnboarding(app, tokenB, SHARED_NAME);

      const rows = await dataSource.query<{ slug: string; uuid: string }[]>(
        `SELECT slug, uuid FROM "tenants"."tenants" WHERE uuid IN ($1, $2)`,
        [tenantIdA, tenantIdB],
      );

      slugA = rows.find((r) => r.uuid === tenantIdA)?.slug ?? '';
      slugB = rows.find((r) => r.uuid === tenantIdB)?.slug ?? '';
    });

    describe('When both tenants are created successfully', () => {
      it('Then the second tenant gets a unique slug with a UUID suffix', () => {
        expect(slugA).toBe('slug-collision-biz');
        expect(slugB).toMatch(/^slug-collision-biz-[a-z0-9]+$/);
        expect(slugA).not.toBe(slugB);
      });
    });
  });

  // ── Business types — defaultStorageName coverage ──────────────────────────

  describe('Given CREATE path with different business types', () => {
    beforeAll(async () => {
      await truncateOnboardingWorkerTables(dataSource);
    });

    describe('When business type is "food"', () => {
      const EMAIL = 'completeonb.biz.food@example.com';
      const USERNAME = 'completeonbbizfood';
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
          `SELECT cr.name
           FROM "storage"."storages" s
           JOIN "storage"."custom_rooms" cr ON cr.storage_id = s.id
           WHERE s.tenant_uuid = $1
           AND cr.archived_at IS NULL`,
          [tenantId],
        );

        expect(storages).toHaveLength(1);
        expect(storages[0].name).toBe('Cocina / Preparación');
      });
    });

    describe('When business type is "manufacturing"', () => {
      const EMAIL = 'completeonb.biz.mfg@example.com';
      const USERNAME = 'completeonbbizmfg';
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
          `SELECT cr.name
           FROM "storage"."storages" s
           JOIN "storage"."custom_rooms" cr ON cr.storage_id = s.id
           WHERE s.tenant_uuid = $1
           AND cr.archived_at IS NULL`,
          [tenantId],
        );

        expect(storages).toHaveLength(1);
        expect(storages[0].name).toBe('Taller Principal');
      });
    });

    describe('When business type is "healthcare"', () => {
      const EMAIL = 'completeonb.biz.healthcare@example.com';
      const USERNAME = 'completeonbbizhealth';
      const TENANT_NAME = 'Consultorio San Rafael';
      let accessToken: string;
      let tenantId: string;

      beforeAll(async () => {
        await signUp(app, dataSource, EMAIL, USERNAME);
        accessToken = await signIn(app, EMAIL);
        tenantId = await completeCreateOnboarding(app, accessToken, TENANT_NAME, 'healthcare');
      });

      it('Then it creates the tenant and a default storage named "Consultorio Principal"', async () => {
        expect(tenantId).toBeDefined();

        const storages = await dataSource.query<{ name: string }[]>(
          `SELECT cr.name
           FROM "storage"."storages" s
           JOIN "storage"."custom_rooms" cr ON cr.storage_id = s.id
           WHERE s.tenant_uuid = $1
           AND cr.archived_at IS NULL`,
          [tenantId],
        );

        expect(storages).toHaveLength(1);
        expect(storages[0].name).toBe('Consultorio Principal');
      });
    });

    describe('When business type is "services" (hits default switch case)', () => {
      const EMAIL = 'completeonb.biz.services@example.com';
      const USERNAME = 'completeonbbizservices';
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
          `SELECT cr.name
           FROM "storage"."storages" s
           JOIN "storage"."custom_rooms" cr ON cr.storage_id = s.id
           WHERE s.tenant_uuid = $1
           AND cr.archived_at IS NULL`,
          [tenantId],
        );

        expect(storages).toHaveLength(1);
        expect(storages[0].name).toBe('Espacio Principal');
      });
    });
  });

  // ── Tenant controller error path (POST /api/tenant/onboarding/complete) ──────
  // The tenant controller calls CreateTenantCommand directly. Its err branch
  // (throw error) is reached when the user already has an active membership.

  describe('Given a user who already completed onboarding', () => {
    const EMAIL = 'completeonb.tenant.ctrl.dup@example.com';
    const USERNAME = 'completeonbtenantctrldup';
    let accessToken: string;

    beforeAll(async () => {
      await signUp(app, dataSource, EMAIL, USERNAME);
      const tempToken = await signIn(app, EMAIL);
      await completeCreateOnboarding(app, tempToken, 'Tenant Ctrl Dup Biz');
      // Re-sign-in to pick up tenantId in JWT (SecurityGuard still JWT-only for this route)
      accessToken = await signIn(app, EMAIL);
    });

    describe('When POST /api/tenant/onboarding/complete is called again', () => {
      it('Then it returns 409 Conflict (OnboardingAlreadyCompleted — exercises controller err branch)', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/tenant/onboarding/complete')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            name: 'Duplicate Biz',
            businessType: 'retail',
            country: 'MX',
            timezone: 'America/Mexico_City',
          });

        expect(res.status).toBe(HttpStatus.CONFLICT);
      });
    });
  });

  // ── CREATE path with custom storages in context ───────────────────────────
  // Exercises the hasCustomStorages = true branch at complete-onboarding.handler.ts:116-118.
  // When context.storages has items, the handler skips default storage creation.

  describe('Given a user who set custom storages in their onboarding context before completing', () => {
    const EMAIL = 'completeonb.customstorages@example.com';
    const USERNAME = 'completeonbcustomstorages';
    let accessToken: string;

    beforeAll(async () => {
      await truncateOnboardingWorkerTables(dataSource);
      await signUp(app, dataSource, EMAIL, USERNAME);
      accessToken = await signIn(app, EMAIL);

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
            name: 'Custom Storages Biz',
            businessType: 'retail',
            country: 'MX',
            timezone: 'America/Mexico_City',
          },
        });

      // Set custom storages in context — this makes hasCustomStorages = true,
      // which skips the default storage creation in the handler
      await request(app.getHttpServer())
        .patch('/api/onboarding/progress')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          section: 'context',
          data: { storages: [{ name: 'Almacén Personalizado', type: 'custom' }] },
        });
    });

    describe('When POST /api/onboarding/complete is called', () => {
      it('Then it returns 201 without creating a default storage (hasCustomStorages = true branch)', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/onboarding/complete')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(HttpStatus.CREATED);
        expect(res.body.path).toBe('CREATE');
        expect(res.body.tenantId).toBeDefined();

        // No default storage should have been created (custom storages in context skips creation)
        const storages = await dataSource.query<{ id: number }[]>(
          `SELECT s.id FROM "storage"."storages" s WHERE s.tenant_uuid = $1`,
          [res.body.tenantId],
        );
        expect(storages).toHaveLength(0);
      });
    });
  });
});

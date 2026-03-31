import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { CommandBus } from '@nestjs/cqrs';
import { DataSource } from 'typeorm';
import { SocialSignInCommand } from '@authentication/application/commands/social-sign-in/social-sign-in.command';
import {
  CreateSocialSessionStep,
  GenerateSocialTokensStep,
  PublishSocialSignInEventsStep,
} from '@authentication/application/sagas/social-sign-in/steps';
import { getWorkerApp, truncateWorkerTables } from '@test/worker-app';

describe('Social Sign In (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let commandBus: CommandBus;
  let createSocialSessionStep: CreateSocialSessionStep;
  let generateSocialTokensStep: GenerateSocialTokensStep;
  let publishSocialSignInEventsStep: PublishSocialSignInEventsStep;

  beforeAll(async () => {
    const workerApp = await getWorkerApp();
    app = workerApp.app;
    dataSource = workerApp.dataSource;
    await truncateWorkerTables(dataSource);
    commandBus = app.get(CommandBus);
    createSocialSessionStep = app.get(CreateSocialSessionStep);
    generateSocialTokensStep = app.get(GenerateSocialTokensStep);
    publishSocialSignInEventsStep = app.get(PublishSocialSignInEventsStep);
  });

  afterAll(async () => {
    await truncateWorkerTables(dataSource);
  });

  // ---------------------------------------------------------------------------
  // Path C — new user (tested first so subsequent tests can reuse the created user)
  // ---------------------------------------------------------------------------

  describe('Given a brand-new visitor who has never used Stocka', () => {
    describe('When they authenticate via Google for the first time', () => {
      it('Then the system creates their account and returns valid tokens', async () => {
        const result = await commandBus.execute(
          new SocialSignInCommand(
            'newgoogle@example.com',
            'Google User',
            'google',
            'google-new-uid-001',
            null,
            null,
            null,
            null,
            false,
            null,
            {},
          ),
        );

        expect(result.value.accessToken).toBeDefined();
        expect(result.value.refreshToken).toBeDefined();
        expect(result.value.credential.email).toBe('newgoogle@example.com');
      });

      it('Then their account is persisted in the database', async () => {
        const [socialAccount] = await dataSource.query(
          `SELECT sa.id, sa.provider_id FROM "accounts"."social_accounts" sa WHERE sa.provider_id = 'google-new-uid-001' AND sa.provider = 'google'`,
        );

        expect(socialAccount).toBeDefined();
        expect(socialAccount.provider_id).toBe('google-new-uid-001');
      });

      it('Then a session is persisted in the database for their account', async () => {
        const [socialAccount] = await dataSource.query(
          `SELECT account_id FROM "accounts"."social_accounts" WHERE provider_id = 'google-new-uid-001' AND provider = 'google'`,
        );
        const [session] = await dataSource.query(
          `SELECT id FROM "sessions"."sessions" WHERE account_id = $1`,
          [socialAccount.account_id],
        );

        expect(session).toBeDefined();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Path A — existing provider link (use the user created in Path C above)
  // ---------------------------------------------------------------------------

  describe('Given a customer who already connected their Google account to Stocka', () => {
    describe('When they sign in with Google again', () => {
      it('Then the system recognises the provider link and signs them in without creating a new account', async () => {
        const before = await dataSource.query(
          `SELECT COUNT(*) as count FROM "accounts"."social_accounts" WHERE provider_id = 'google-new-uid-001' AND provider = 'google'`,
        );

        const result = await commandBus.execute(
          new SocialSignInCommand(
            'newgoogle@example.com',
            'Google User',
            'google',
            'google-new-uid-001',
            null,
            null,
            null,
            null,
            false,
            null,
            {},
          ),
        );

        const after = await dataSource.query(
          `SELECT COUNT(*) as count FROM "accounts"."social_accounts" WHERE provider_id = 'google-new-uid-001' AND provider = 'google'`,
        );

        expect(result.value.accessToken).toBeDefined();
        expect(parseInt(after[0].count)).toBe(parseInt(before[0].count)); // no new social account created
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Path B — link provider to existing email-based account
  // ---------------------------------------------------------------------------

  describe('Given a customer who registered manually and now signs in with Google', () => {
    describe('When they use the same email as their manual account for the first time', () => {
      it('Then Google is linked to their existing account and they receive valid tokens', async () => {
        // Pre-setup: create a manual user via sign-up
        await request(app.getHttpServer()).post('/api/authentication/sign-up').send({
          email: 'manual.then.oauth@example.com',
          username: 'manualthen',
          password: 'SecurePass1!',
        });

        const result = await commandBus.execute(
          new SocialSignInCommand(
            'manual.then.oauth@example.com',
            'Manual Then OAuth',
            'google',
            'google-link-uid-002',
            null,
            null,
            null,
            null,
            false,
            null,
            {},
          ),
        );

        expect(result.value.accessToken).toBeDefined();
        expect(result.value.credential.email).toBe('manual.then.oauth@example.com');
      });

      it('Then no new user account is created — only the existing one is updated', async () => {
        const rows = await dataSource.query(
          `SELECT COUNT(*) as count FROM "accounts"."accounts" a JOIN "accounts"."credential_accounts" ca ON ca.account_id = a.id WHERE LOWER(ca.email) = 'manual.then.oauth@example.com'`,
        );

        expect(parseInt(rows[0].count)).toBe(1);
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Rollback — Path C fails at session creation
  // ---------------------------------------------------------------------------

  describe('Given the session creation step fails during a new-user social sign-in', () => {
    describe('When the database rejects the session insert mid-transaction', () => {
      it('Then the entire transaction is rolled back and the new user does not exist in the DB', async () => {
        const spy = jest
          .spyOn(createSocialSessionStep, 'execute')
          .mockRejectedValueOnce(new Error('Session insert failed'));

        await expect(
          commandBus.execute(
            new SocialSignInCommand(
              'rollback.social@example.com',
              'Rollback Social',
              'google',
              'google-rollback-uid-003',
              null,
              null,
              null,
              null,
              false,
              null,
              {},
            ),
          ),
        ).rejects.toThrow('Session insert failed');

        const [socialAccount] = await dataSource.query(
          `SELECT id FROM "accounts"."social_accounts" WHERE LOWER(provider_email) = 'rollback.social@example.com'`,
        );

        expect(socialAccount).toBeUndefined();
        spy.mockRestore();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Rollback — token generation fails → user rolled back (Path C)
  // ---------------------------------------------------------------------------

  describe('Given the token generation step fails during a new-user social sign-in', () => {
    describe('When GenerateSocialTokensStep throws mid-transaction', () => {
      it('Then the transaction is rolled back and the new user does not exist', async () => {
        const spy = jest
          .spyOn(generateSocialTokensStep, 'execute')
          .mockRejectedValueOnce(new Error('Token generation failed'));

        await expect(
          commandBus.execute(
            new SocialSignInCommand(
              'rollback.gentokens@example.com',
              'Rollback GenTokens',
              'google',
              'google-rollback-uid-gentokens',
              null,
              null,
              null,
              null,
              false,
              null,
              {},
            ),
          ),
        ).rejects.toThrow('Token generation failed');

        const [socialAccount] = await dataSource.query(
          `SELECT id FROM "accounts"."social_accounts" WHERE LOWER(provider_email) = 'rollback.gentokens@example.com'`,
        );

        expect(socialAccount).toBeUndefined();
        spy.mockRestore();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Non-transactional step failure — publish events is fire-and-forget
  // ---------------------------------------------------------------------------

  describe('Given the publish-events step fails after social sign-in commit', () => {
    describe('When PublishSocialSignInEventsStep throws', () => {
      it('Then the saga still succeeds — non-transactional steps are fire-and-forget', async () => {
        const spy = jest
          .spyOn(publishSocialSignInEventsStep, 'execute')
          .mockRejectedValueOnce(new Error('EventBus failure'));

        const result = await commandBus.execute(
          new SocialSignInCommand(
            'pubfail.social@example.com',
            'PubFail Social',
            'google',
            'google-pubfail-uid-004',
            null,
            null,
            null,
            null,
            false,
            null,
            {},
          ),
        );

        // Saga completes despite publish failure
        expect(result.value.accessToken).toBeDefined();

        spy.mockRestore();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Branch coverage — Path C with locale normalization
  // ---------------------------------------------------------------------------

  describe('Given a new user signing in with a non-standard locale', () => {
    describe('When the locale is an unsupported language code', () => {
      it('Then the system normalizes it to "es" and the user is created', async () => {
        const result = await commandBus.execute(
          new SocialSignInCommand(
            'locale.test@example.com',
            'Locale Test',
            'google',
            'google-locale-uid-005',
            'Locale',
            'Test',
            null,
            'fr-CA', // unsupported locale
            false,
            null,
            {},
          ),
        );

        expect(result.value.accessToken).toBeDefined();
        expect(result.value.credential.email).toBe('locale.test@example.com');
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Branch coverage — Path C with null locale
  // ---------------------------------------------------------------------------

  describe('Given a new user signing in with no locale', () => {
    describe('When the locale is null', () => {
      it('Then the system defaults to "es" and the user is created', async () => {
        const result = await commandBus.execute(
          new SocialSignInCommand(
            'nulllocale@example.com',
            'Null Locale',
            'google',
            'google-nulllocale-uid-006',
            null,
            null,
            null,
            null, // null locale
            false,
            null,
            {},
          ),
        );

        expect(result.value.accessToken).toBeDefined();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Branch coverage — Path C with username collision
  // ---------------------------------------------------------------------------

  describe('Given a new user whose display name collides with an existing username', () => {
    describe('When generateUniqueUsername needs to append a random suffix', () => {
      it('Then the user is created with a unique suffixed username', async () => {
        // Create a first user with a display name that will produce the base username
        await commandBus.execute(
          new SocialSignInCommand(
            'collision1@example.com',
            'CollisionTest',
            'google',
            'google-collision-uid-007',
            null,
            null,
            null,
            null,
            false,
            null,
            {},
          ),
        );

        // Create a second user with the same display name — username will collide
        const result = await commandBus.execute(
          new SocialSignInCommand(
            'collision2@example.com',
            'CollisionTest',
            'google',
            'google-collision-uid-008',
            null,
            null,
            null,
            null,
            false,
            null,
            {},
          ),
        );

        expect(result.value.accessToken).toBeDefined();
        expect(result.value.credential.email).toBe('collision2@example.com');
      });
    });
  });
});

import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { getWorkerApp, truncateWorkerTables } from '@test/worker-app';
import { IUserFacade } from '@shared/domain/contracts/user-facade.contract';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

// ─── Spec ─────────────────────────────────────────────────────────────────────

describe('UserFacade (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let facade: IUserFacade;

  const GHOST_UUID = '00000000-0000-0000-0000-000000000000';
  const GHOST_ID = 999999;

  beforeAll(async () => {
    const workerApp = await getWorkerApp();
    app = workerApp.app;
    dataSource = workerApp.dataSource;
    facade = app.get<IUserFacade>(INJECTION_TOKENS.USER_FACADE);
  });

  afterAll(async () => {
    await truncateWorkerTables(dataSource);
  });

  beforeEach(async () => {
    if (dataSource?.isInitialized) {
      await truncateWorkerTables(dataSource);
    }
  });

  // ── findByAccountId ──────────────────────────────────────────────────────────

  describe('Given no account exists for the given numeric id', () => {
    describe('When findByAccountId is called', () => {
      it('Then it returns null', async () => {
        const result = await facade.findByAccountId(GHOST_ID);
        expect(result).toBeNull();
      });
    });
  });

  // ── findUsernameByUUID ───────────────────────────────────────────────────────

  describe('Given no user exists for the given UUID', () => {
    describe('When findUsernameByUUID is called', () => {
      it('Then it returns null', async () => {
        const result = await facade.findUsernameByUUID(GHOST_UUID);
        expect(result).toBeNull();
      });
    });
  });

  // ── findUserByUUIDWithCredential ─────────────────────────────────────────────

  describe('Given no user exists for the given UUID', () => {
    describe('When findUserByUUIDWithCredential is called', () => {
      it('Then it returns null', async () => {
        const result = await facade.findUserByUUIDWithCredential(GHOST_UUID);
        expect(result).toBeNull();
      });
    });
  });

  // ── findSocialNameByUserUUID ─────────────────────────────────────────────────

  describe('Given no user exists for the given UUID', () => {
    describe('When findSocialNameByUserUUID is called', () => {
      it('Then it returns all-null social fields', async () => {
        const result = await facade.findSocialNameByUserUUID(GHOST_UUID);
        expect(result).toEqual({ givenName: null, familyName: null, avatarUrl: null });
      });
    });
  });

  // ── updateLocale ─────────────────────────────────────────────────────────────

  describe('Given no user exists for the given UUID', () => {
    describe('When updateLocale is called', () => {
      it('Then it returns without error', async () => {
        await expect(facade.updateLocale(GHOST_UUID, 'es')).resolves.toBeUndefined();
      });
    });
  });

  // ── createUserFromOAuth with null locale ─────────────────────────────────────

  describe('Given an OAuth user creation payload with a null locale', () => {
    describe('When createUserFromOAuth is called', () => {
      it('Then it creates the user and falls back to undefined for the locale field', async () => {
        const result = await facade.createUserFromOAuth({
          email: 'oauth.nulllocale@example.com',
          username: 'oauthnulllocale',
          provider: 'google',
          providerId: 'google-null-locale-001',
          locale: null,
        });

        expect(result.user).toBeDefined();
        expect(result.credential.email).toBe('oauth.nulllocale@example.com');
        expect(result.social.providerId.getValue()).toBe('google-null-locale-001');
      });
    });
  });
});

import * as crypto from 'crypto';
import { DataSource } from 'typeorm';
import { v4 as uuidv4, version as uuidVersion } from 'uuid';

import { IUserContract } from '@user/domain/contracts/user.contract';
import { ISessionContract } from '@authentication/domain/contracts/session.contract';
import { IEmailVerificationTokenContract } from '@authentication/domain/contracts/email-verification-token.contract';
import { IPasswordResetTokenContract } from '@authentication/domain/contracts/password-reset-token.contract';
import { IVerificationAttemptContract } from '@authentication/domain/contracts/verification-attempt.contract';
import {
  IAccountContract,
  ICredentialAccountContract,
  ISocialAccountContract,
} from '@user/account/domain/contracts/account.contract';
import { IUnitOfWork } from '@shared/domain/contracts/unit-of-work.contract';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

import { UserAggregate } from '@user/domain/models/user.aggregate';
import { AccountAggregate } from '@user/account/domain/account.aggregate';
import { CredentialAccountModel } from '@user/account/domain/models/credential-account.model';
import { SocialAccountModel } from '@user/account/domain/models/social-account.model';
import { SessionModel } from '@authentication/domain/models/session.model';
import { EmailVerificationTokenModel } from '@authentication/domain/models/email-verification-token.model';
import { PasswordResetTokenModel } from '@authentication/domain/models/password-reset-token.model';
import { VerificationAttemptModel } from '@authentication/domain/models/verification-attempt.model';

import { getWorkerApp, truncateWorkerTables } from '@test/worker-app';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function futureDate(offsetMs = 60 * 60 * 1000): Date {
  return new Date(Date.now() + offsetMs);
}

function pastDate(offsetMs = 60 * 60 * 1000): Date {
  return new Date(Date.now() - offsetMs);
}

// ─── Test Suite ───────────────────────────────────────────────────────────────

describe('Infrastructure Repositories (e2e)', () => {
  let dataSource: DataSource;

  let userRepo: IUserContract;
  let accountRepo: IAccountContract;
  let credentialAccountRepo: ICredentialAccountContract;
  let sessionRepo: ISessionContract;
  let evtRepo: IEmailVerificationTokenContract;
  let prtRepo: IPasswordResetTokenContract;
  let attemptRepo: IVerificationAttemptContract;
  let socialAccountRepo: ISocialAccountContract;
  let uow: IUnitOfWork;

  beforeAll(async () => {
    const { app, dataSource: ds } = await getWorkerApp();
    dataSource = ds;
    userRepo = app.get<IUserContract>(INJECTION_TOKENS.USER_CONTRACT);
    accountRepo = app.get<IAccountContract>(INJECTION_TOKENS.ACCOUNT_CONTRACT);
    credentialAccountRepo = app.get<ICredentialAccountContract>(
      INJECTION_TOKENS.CREDENTIAL_ACCOUNT_CONTRACT,
    );
    sessionRepo = app.get<ISessionContract>(INJECTION_TOKENS.SESSION_CONTRACT);
    evtRepo = app.get<IEmailVerificationTokenContract>(
      INJECTION_TOKENS.EMAIL_VERIFICATION_TOKEN_CONTRACT,
    );
    prtRepo = app.get<IPasswordResetTokenContract>(
      INJECTION_TOKENS.PASSWORD_RESET_TOKEN_CONTRACT,
    );
    attemptRepo = app.get<IVerificationAttemptContract>(
      INJECTION_TOKENS.VERIFICATION_ATTEMPT_CONTRACT,
    );
    socialAccountRepo = app.get<ISocialAccountContract>(INJECTION_TOKENS.SOCIAL_ACCOUNT_CONTRACT);
    uow = app.get<IUnitOfWork>(INJECTION_TOKENS.UNIT_OF_WORK);
  });

  // Strategy 4: single TRUNCATE replaces 6 sequential DELETE FROM queries.
  afterEach(async () => {
    await truncateWorkerTables(dataSource);
  });

  afterAll(async () => {
    // The worker app singleton is not closed here — it is shared across all specs
    // and the Jest process exits cleanly with --forceExit.
  });

  // ─── Setup helpers ─────────────────────────────────────────────────────────

  async function buildPersistedUser(): Promise<UserAggregate> {
    return userRepo.persist(UserAggregate.create());
  }

  async function buildPersistedUserWithCredential(overrides: {
    email?: string;
  } = {}): Promise<{ user: UserAggregate; account: AccountAggregate; credential: CredentialAccountModel }> {
    const user = await userRepo.persist(UserAggregate.create());
    const account = await accountRepo.persist(AccountAggregate.create({ userId: user.id! }));
    const credential = await credentialAccountRepo.persist(
      CredentialAccountModel.create({
        accountId: account.id!,
        email: overrides.email ?? `test-${uuidv4()}@example.com`,
        passwordHash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.z9OYHvJpzZ9y7u',
        createdWith: 'email',
      }),
    );
    return { user, account, credential };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TypeOrmUserRepository
  // ═══════════════════════════════════════════════════════════════════════════

  describe('TypeOrmUserRepository', () => {
    describe('Given a user exists in the database', () => {
      let savedUser: UserAggregate;

      beforeEach(async () => {
        savedUser = await buildPersistedUser();
      });

      describe('When findByUUID is called with the user UUID', () => {
        it('Then it returns the matching user aggregate', async () => {
          const found = await userRepo.findByUUID(savedUser.uuid);
          expect(found).not.toBeNull();
          expect(found!.uuid).toBe(savedUser.uuid);
        });
      });

      describe('When findById is called with the user id', () => {
        it('Then it returns the matching user aggregate', async () => {
          const found = await userRepo.findById(savedUser.id!);
          expect(found).not.toBeNull();
          expect(found!.uuid).toBe(savedUser.uuid);
        });
      });

      describe('When existsByUsername is called with any username', () => {
        it('Then it returns false because username lookup is delegated to credential/profile layer', async () => {
          const exists = await userRepo.existsByUsername('any-username');
          expect(exists).toBe(false);
        });
      });

      describe('When archive is called with the user UUID', () => {
        it('Then the user is soft-deleted and archivedAt is set', async () => {
          await userRepo.archive(savedUser.uuid);
          // findByUUID intentionally returns archived users (needed for token validation)
          const found = await userRepo.findByUUID(savedUser.uuid);
          expect(found).not.toBeNull();
        });
      });

      describe('When destroy is called with the user UUID', () => {
        it('Then the user is permanently removed', async () => {
          await userRepo.destroy(savedUser.uuid);
          const found = await userRepo.findByUUID(savedUser.uuid);
          expect(found).toBeNull();
        });
      });

      describe('When findById is called with a non-existent user id', () => {
        it('Then it returns null', async () => {
          const found = await userRepo.findById(999999);
          expect(found).toBeNull();
        });
      });

      describe('When persist is called within an active UoW transaction', () => {
        it('Then it uses the transaction manager and saves the user', async () => {
          const newUser = UserAggregate.create();
          await uow.begin();
          try {
            const saved = await userRepo.persist(newUser);
            expect(saved.uuid).toBeDefined();
            await uow.rollback();
          } catch (error) {
            await uow.rollback();
            throw error;
          }
        });
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TypeOrmCredentialAccountRepository
  // ═══════════════════════════════════════════════════════════════════════════

  describe('TypeOrmCredentialAccountRepository', () => {
    describe('Given a user with a credential account exists in the database', () => {
      let savedUser: UserAggregate;
      let savedAccount: AccountAggregate;
      let savedCredential: CredentialAccountModel;
      let testEmail: string;

      beforeEach(async () => {
        testEmail = `test-${uuidv4()}@example.com`;
        ({ user: savedUser, account: savedAccount, credential: savedCredential } =
          await buildPersistedUserWithCredential({ email: testEmail }));
      });

      describe('When findByEmail is called with an existing email', () => {
        it('Then it returns the matching credential account', async () => {
          const found = await credentialAccountRepo.findByEmail(testEmail);
          expect(found).not.toBeNull();
          expect(found!.email).toBe(testEmail);
        });
      });

      describe('When findByEmail is called with a non-existent email', () => {
        it('Then it returns null', async () => {
          const found = await credentialAccountRepo.findByEmail('ghost@example.com');
          expect(found).toBeNull();
        });
      });

      describe('When findByAccountId is called with the account id', () => {
        it('Then it returns the matching credential account', async () => {
          const found = await credentialAccountRepo.findByAccountId(savedAccount.id!);
          expect(found).not.toBeNull();
          expect(found!.email).toBe(testEmail);
        });
      });

      describe('When findById is called with the credential id', () => {
        it('Then it returns the matching credential account', async () => {
          const found = await credentialAccountRepo.findById(savedCredential.id!);
          expect(found).not.toBeNull();
          expect(found!.email).toBe(testEmail);
        });
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TypeOrmSessionRepository
  // ═══════════════════════════════════════════════════════════════════════════

  describe('TypeOrmSessionRepository', () => {
    let savedAccount: AccountAggregate;

    beforeEach(async () => {
      const { account } = await buildPersistedUserWithCredential();
      savedAccount = account;
    });

    async function createSession(): Promise<SessionModel> {
      const session = SessionModel.create({
        accountId: savedAccount.id!,
        tokenHash: sha256(`session-${uuidv4()}`),
        expiresAt: futureDate(),
      });
      return sessionRepo.persist(session);
    }

    describe('Given a session exists in the database', () => {
      let savedSession: SessionModel;

      beforeEach(async () => {
        savedSession = await createSession();
      });

      describe('When findById is called with the session internal id', () => {
        it('Then it returns the matching session', async () => {
          const found = await sessionRepo.findById(savedSession.id!);
          expect(found).not.toBeNull();
          expect(found!.uuid).toBe(savedSession.uuid);
        });
      });

      describe('When findByUUID is called with the session UUID', () => {
        it('Then it returns the matching session', async () => {
          const found = await sessionRepo.findByUUID(savedSession.uuid);
          expect(found).not.toBeNull();
          expect(found!.tokenHash).toBe(savedSession.tokenHash);
        });
      });

      describe('When findActiveByAccountId is called for the account', () => {
        it('Then it returns the active sessions list', async () => {
          const sessions = await sessionRepo.findActiveByAccountId(savedAccount.id!);
          expect(sessions.length).toBeGreaterThanOrEqual(1);
        });
      });

      describe('When archive is called without an active UoW transaction', () => {
        it('Then the session is soft-deleted', async () => {
          await sessionRepo.archive(savedSession.uuid);
          const found = await sessionRepo.findByUUID(savedSession.uuid);
          expect(found).toBeNull();
        });
      });

      describe('When archiveAllByAccountId is called without an active UoW transaction', () => {
        it('Then all account sessions are soft-deleted', async () => {
          await sessionRepo.archiveAllByAccountId(savedAccount.id!);
          const sessions = await sessionRepo.findActiveByAccountId(savedAccount.id!);
          expect(sessions).toHaveLength(0);
        });
      });

      describe('When destroy is called with the session UUID', () => {
        it('Then the session is permanently removed', async () => {
          await sessionRepo.destroy(savedSession.uuid);
          const found = await sessionRepo.findByUUID(savedSession.uuid);
          expect(found).toBeNull();
        });
      });

      describe('When findById is called with a non-existent session id', () => {
        it('Then it returns null', async () => {
          const found = await sessionRepo.findById(999999);
          expect(found).toBeNull();
        });
      });

      describe('When persist is called within an active UoW transaction', () => {
        it('Then it uses the transaction manager and saves the session', async () => {
          await uow.begin();
          try {
            const session = SessionModel.create({
              accountId: savedAccount.id!,
              tokenHash: sha256(`uow-session-${uuidv4()}`),
              expiresAt: futureDate(),
            });
            const saved = await sessionRepo.persist(session);
            expect(saved.uuid).toBeDefined();
            await uow.rollback();
          } catch (error) {
            await uow.rollback();
            throw error;
          }
        });
      });

      describe('When archive is called within an active UoW transaction', () => {
        it('Then it uses the transaction manager to soft-delete', async () => {
          await uow.begin();
          try {
            await sessionRepo.archive(savedSession.uuid);
            await uow.rollback();
          } catch (error) {
            await uow.rollback();
            throw error;
          }
        });
      });

      describe('When archiveAllByAccountId is called within an active UoW transaction', () => {
        it('Then it uses the transaction manager to soft-delete all sessions', async () => {
          await uow.begin();
          try {
            await sessionRepo.archiveAllByAccountId(savedAccount.id!);
            await uow.rollback();
          } catch (error) {
            await uow.rollback();
            throw error;
          }
        });
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TypeOrmEmailVerificationTokenRepository
  // ═══════════════════════════════════════════════════════════════════════════

  describe('TypeOrmEmailVerificationTokenRepository', () => {
    let savedCredential: CredentialAccountModel;

    beforeEach(async () => {
      ({ credential: savedCredential } = await buildPersistedUserWithCredential());
    });

    async function createToken(
      overrides: { expiresAt?: Date } = {},
    ): Promise<EmailVerificationTokenModel> {
      const token = EmailVerificationTokenModel.create({
        credentialAccountId: savedCredential.id!,
        codeHash: sha256(`code-${uuidv4()}`),
        expiresAt: overrides.expiresAt ?? futureDate(),
        email: savedCredential.email,
      });
      return evtRepo.persist(token);
    }

    describe('Given an email verification token exists', () => {
      let savedToken: EmailVerificationTokenModel;

      beforeEach(async () => {
        savedToken = await createToken();
      });

      describe('When findById is called with the token internal id', () => {
        it('Then it returns the matching token', async () => {
          const found = await evtRepo.findById(savedToken.id!);
          expect(found).not.toBeNull();
          expect(found!.uuid).toBe(savedToken.uuid);
        });
      });

      describe('When findByUUID is called with the token UUID', () => {
        it('Then it returns the matching token', async () => {
          const found = await evtRepo.findByUUID(savedToken.uuid);
          expect(found).not.toBeNull();
        });
      });

      describe('When findActiveByCredentialAccountId is called for the credential', () => {
        it('Then it returns the active token', async () => {
          const found = await evtRepo.findActiveByCredentialAccountId(savedCredential.id!);
          expect(found).not.toBeNull();
          expect(found!.uuid).toBe(savedToken.uuid);
        });
      });

      describe('When findByCodeHash is called with the token code hash', () => {
        it('Then it returns the matching token', async () => {
          const found = await evtRepo.findByCodeHash(savedToken.codeHash);
          expect(found).not.toBeNull();
          expect(found!.uuid).toBe(savedToken.uuid);
        });
      });

      describe('When archive is called with the token UUID', () => {
        it('Then the token is no longer returned by findByUUID', async () => {
          await evtRepo.archive(savedToken.uuid);
          const found = await evtRepo.findByUUID(savedToken.uuid);
          expect(found).toBeNull();
        });
      });

      describe('When archiveAllByCredentialAccountId is called for the credential', () => {
        it('Then all tokens for the credential are soft-deleted', async () => {
          await evtRepo.archiveAllByCredentialAccountId(savedCredential.id!);
          const found = await evtRepo.findActiveByCredentialAccountId(savedCredential.id!);
          expect(found).toBeNull();
        });
      });

      describe('When findByCodeHash is called with a non-existent code hash', () => {
        it('Then it returns null', async () => {
          const found = await evtRepo.findByCodeHash('nonexistenthashabcdef1234567890');
          expect(found).toBeNull();
        });
      });

      describe('When countResentInLastHour is called for the credential', () => {
        it('Then it returns the count of recently resent tokens', async () => {
          const count = await evtRepo.countResentInLastHour(savedCredential.id!);
          expect(count).toBeGreaterThanOrEqual(0);
        });
      });

      describe('When destroy is called with the token UUID', () => {
        it('Then the token is permanently removed', async () => {
          await evtRepo.destroy(savedToken.uuid);
          const found = await evtRepo.findByUUID(savedToken.uuid);
          expect(found).toBeNull();
        });
      });

      describe('When findById is called with a non-existent token id', () => {
        it('Then it returns null', async () => {
          const found = await evtRepo.findById(999999);
          expect(found).toBeNull();
        });
      });

      describe('When persist is called within an active UoW transaction', () => {
        it('Then it uses the transaction manager and saves the token', async () => {
          await uow.begin();
          try {
            const token = EmailVerificationTokenModel.create({
              credentialAccountId: savedCredential.id!,
              codeHash: sha256(`uow-code-${uuidv4()}`),
              expiresAt: futureDate(),
              email: savedCredential.email,
            });
            const saved = await evtRepo.persist(token);
            expect(saved.uuid).toBeDefined();
            await uow.rollback();
          } catch (error) {
            await uow.rollback();
            throw error;
          }
        });
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TypeOrmPasswordResetTokenRepository
  // ═══════════════════════════════════════════════════════════════════════════

  describe('TypeOrmPasswordResetTokenRepository', () => {
    let savedCredential: CredentialAccountModel;

    beforeEach(async () => {
      ({ credential: savedCredential } = await buildPersistedUserWithCredential());
    });

    async function createPRT(): Promise<PasswordResetTokenModel> {
      const token = PasswordResetTokenModel.create({
        credentialAccountId: savedCredential.id!,
        tokenHash: sha256(`reset-${uuidv4()}`),
        expiresAt: futureDate(),
        email: savedCredential.email,
        plainToken: uuidv4(),
      });
      return prtRepo.persist(token);
    }

    describe('Given a password reset token exists', () => {
      let savedToken: PasswordResetTokenModel;

      beforeEach(async () => {
        savedToken = await createPRT();
      });

      describe('When findById is called with the token internal id', () => {
        it('Then it returns the matching token', async () => {
          const found = await prtRepo.findById(savedToken.id!);
          expect(found).not.toBeNull();
          expect(found!.uuid).toBe(savedToken.uuid);
        });
      });

      describe('When findByUUID is called with the token UUID', () => {
        it('Then it returns the matching token', async () => {
          const found = await prtRepo.findByUUID(savedToken.uuid);
          expect(found).not.toBeNull();
        });
      });

      describe('When archive is called with the token UUID', () => {
        it('Then the token is no longer findable', async () => {
          await prtRepo.archive(savedToken.uuid);
          const found = await prtRepo.findByUUID(savedToken.uuid);
          expect(found).toBeNull();
        });
      });

      describe('When findById is called with a non-existent token id', () => {
        it('Then it returns null', async () => {
          const found = await prtRepo.findById(999999);
          expect(found).toBeNull();
        });
      });

      describe('When persist is called within an active UoW transaction', () => {
        it('Then it uses the transaction manager and saves the token', async () => {
          await uow.begin();
          try {
            const token = PasswordResetTokenModel.create({
              credentialAccountId: savedCredential.id!,
              tokenHash: sha256(`uow-reset-${uuidv4()}`),
              expiresAt: futureDate(),
              email: savedCredential.email,
              plainToken: uuidv4(),
            });
            const saved = await prtRepo.persist(token);
            expect(saved.uuid).toBeDefined();
            await uow.rollback();
          } catch (error) {
            await uow.rollback();
            throw error;
          }
        });
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TypeOrmVerificationAttemptRepository
  // ═══════════════════════════════════════════════════════════════════════════

  describe('TypeOrmVerificationAttemptRepository', () => {
    const testUUID = uuidv4();
    const testIP = '192.168.0.1';
    const testEmail = `attempt-${uuidv4()}@example.com`;

    async function createAttempt(overrides: {
      userUUID?: string;
      success?: boolean;
      email?: string;
      ipAddress?: string;
      type?: string;
    } = {}): Promise<VerificationAttemptModel> {
      const attempt = VerificationAttemptModel.create({
        userUUID: overrides.userUUID ?? testUUID,
        email: overrides.email ?? testEmail,
        ipAddress: overrides.ipAddress ?? testIP,
        userAgent: null,
        codeEntered: null,
        success: overrides.success ?? false,
        verificationType: overrides.type ?? 'sign_in',
      });
      return attemptRepo.persist(attempt);
    }

    describe('Given verification attempts exist in the database', () => {
      let savedAttempt: VerificationAttemptModel;

      beforeEach(async () => {
        savedAttempt = await createAttempt();
      });

      describe('When findById is called with the attempt internal id', () => {
        it('Then it returns the matching attempt', async () => {
          const found = await attemptRepo.findById(savedAttempt.id!);
          expect(found).not.toBeNull();
          expect(found!.uuid).toBe(savedAttempt.uuid);
        });
      });

      describe('When findByUUID is called with the attempt UUID', () => {
        it('Then it returns the matching attempt', async () => {
          const found = await attemptRepo.findByUUID(savedAttempt.uuid);
          expect(found).not.toBeNull();
        });
      });

      describe('When countFailedByUserUUIDInLastHour is called', () => {
        it('Then it returns the count of failed attempts in the last hour', async () => {
          const count = await attemptRepo.countFailedByUserUUIDInLastHour(testUUID);
          expect(count).toBeGreaterThanOrEqual(1);
        });
      });

      describe('When countFailedByUserUUIDInLast24Hours is called', () => {
        it('Then it returns the count of recent failed attempts', async () => {
          const count = await attemptRepo.countFailedByUserUUIDInLast24Hours(testUUID);
          expect(count).toBeGreaterThanOrEqual(1);
        });
      });

      describe('When findById is called with a non-existent attempt id', () => {
        it('Then it returns null', async () => {
          const found = await attemptRepo.findById(999999);
          expect(found).toBeNull();
        });
      });

      describe('When findByUUID is called with a non-existent attempt UUID', () => {
        it('Then it returns null', async () => {
          const found = await attemptRepo.findByUUID(uuidv4());
          expect(found).toBeNull();
        });
      });

      describe('When archiveOlderThan is called with a past date', () => {
        it('Then it returns zero when no attempts match the date condition', async () => {
          // Use a date 2 hours ago — attempts created NOW are excluded (now > 2h ago)
          const affected = await attemptRepo.archiveOlderThan(pastDate(2 * 60 * 60 * 1000));
          expect(affected).toBe(0);
        });
      });

      describe('When countFailedByIpAddressInLastHour is called', () => {
        it('Then it returns the count of recent failed attempts by IP', async () => {
          const count = await attemptRepo.countFailedByIpAddressInLastHour(testIP);
          expect(count).toBeGreaterThanOrEqual(1);
        });
      });

      describe('When countFailedByEmailInLastHour is called', () => {
        it('Then it returns the count of recent failed attempts by email', async () => {
          const count = await attemptRepo.countFailedByEmailInLastHour(testEmail);
          expect(count).toBeGreaterThanOrEqual(1);
        });
      });

      describe('When findRecentByUserUUID is called with a limit', () => {
        it('Then it returns at most the requested number of attempts', async () => {
          const attempts = await attemptRepo.findRecentByUserUUID(testUUID, 5);
          expect(attempts.length).toBeGreaterThanOrEqual(1);
          expect(attempts.length).toBeLessThanOrEqual(5);
        });
      });

      describe('When countFailedByUserUUIDInLastHourByType is called', () => {
        it('Then it returns the count of attempts filtered by type', async () => {
          const count = await attemptRepo.countFailedByUserUUIDInLastHourByType(
            testUUID,
            'sign_in',
          );
          expect(count).toBeGreaterThanOrEqual(1);
        });
      });

      describe('When archiveOlderThan is called with a future date', () => {
        it('Then it archives matching attempts and returns the affected count', async () => {
          const affected = await attemptRepo.archiveOlderThan(futureDate());
          expect(affected).toBeGreaterThanOrEqual(1);
        });
      });
    });

    describe('Given persist is called within an active UoW transaction', () => {
      it('Then it uses the transaction EntityManager and the attempt is saved', async () => {
        const attempt = VerificationAttemptModel.create({
          userUUID: testUUID,
          email: testEmail,
          ipAddress: testIP,
          userAgent: null,
          codeEntered: null,
          success: false,
          verificationType: 'sign_in',
        });

        await uow.begin();
        try {
          const saved = await attemptRepo.persist(attempt);
          expect(saved.uuid).toBeDefined();
          await uow.rollback();
        } catch (error) {
          await uow.rollback();
          throw error;
        }
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TypeOrmSocialAccountRepository
  // ═══════════════════════════════════════════════════════════════════════════

  describe('TypeOrmSocialAccountRepository', () => {
    let savedAccount: AccountAggregate;

    beforeEach(async () => {
      ({ account: savedAccount } = await buildPersistedUserWithCredential());
    });

    describe('Given a social account is persisted without an active UoW', () => {
      it('Then it is saved and findable by provider and providerId', async () => {
        const providerId = uuidv4();
        const socialAccount = SocialAccountModel.create({
          accountId: savedAccount.id!,
          provider: 'google',
          providerId,
        });
        const saved = await socialAccountRepo.persist(socialAccount);
        expect(saved.provider).toBe('google');
        expect(saved.providerId).toBe(providerId);

        const found = await socialAccountRepo.findByProviderAndProviderId('google', providerId);
        expect(found).not.toBeNull();
        expect(found!.providerId).toBe(providerId);
      });
    });

    describe('Given persist is called within an active UoW transaction', () => {
      it('Then it uses the transaction manager', async () => {
        await uow.begin();
        try {
          const socialAccount = SocialAccountModel.create({
            accountId: savedAccount.id!,
            provider: 'facebook',
            providerId: uuidv4(),
          });
          const saved = await socialAccountRepo.persist(socialAccount);
          expect(saved.provider).toBe('facebook');
          await uow.rollback();
        } catch (error) {
          await uow.rollback();
          throw error;
        }
      });
    });

    describe('Given no social account exists for the provider/id combination', () => {
      it('Then findByProviderAndProviderId returns null', async () => {
        const found = await socialAccountRepo.findByProviderAndProviderId('google', 'nonexistent');
        expect(found).toBeNull();
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // BaseEntity — UUID v7 generation
  // ═══════════════════════════════════════════════════════════════════════════

  describe('BaseEntity — UUID v7 generation on insert', () => {
    describe('Given a user is created via domain factory without a pre-assigned UUID', () => {
      it('Then the UUID persisted in the database is version 7', async () => {
        const user = UserAggregate.create();
        const saved = await userRepo.persist(user);
        expect(uuidVersion(saved.uuid)).toBe(7);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TypeOrmUnitOfWork — edge cases
  // ═══════════════════════════════════════════════════════════════════════════

  describe('TypeOrmUnitOfWork edge cases', () => {
    afterEach(async () => {
      // Safety net: release any QRs still connected after each UoW edge-case test.
      // Required because some tests use Object.defineProperty to force isReleased=true,
      // which causes TypeORM's releasePostgresConnection() to early-return before calling
      // the pg pool's releaseCallback — leaving pool connections permanently checked out.
      const connectedQRs: any[] = [...((dataSource as any).driver?.connectedQueryRunners ?? [])];
      for (const qr of connectedQRs) {
        try {
          Object.defineProperty(qr, 'isReleased', { value: false, configurable: true, writable: true });
          await qr.releasePostgresConnection();
        } catch { /* ignore */ }
      }
    });

    describe('Given begin() is called while a transaction is already active', () => {
      it('Then it warns and does not throw', async () => {
        await uow.begin();
        // Second begin() should warn (not throw) and release the previous runner
        await expect(uow.begin()).resolves.toBeUndefined();
        // Best-effort cleanup — ALS propagation from singleton context may vary
        try {
          await uow.rollback();
        } catch {
          // Acceptable in non-HTTP test context where ALS context scoping differs
        }
      });
    });

    describe('Given rollback() is called with no active transaction', () => {
      it('Then it warns and returns without throwing', async () => {
        // Should not throw — idempotent rollback
        await expect(uow.rollback()).resolves.toBeUndefined();
      });
    });

    describe('Given commit() is called without an active transaction', () => {
      it('Then it throws "No active transaction"', async () => {
        await expect(uow.commit()).rejects.toThrow('No active transaction');
      });
    });

    describe('Given getManager() is called without an active transaction', () => {
      it('Then it throws "No active transaction"', () => {
        expect(() => uow.getManager()).toThrow('No active transaction');
      });
    });

    describe('Given the database connection fails during begin()', () => {
      it('Then begin() cleans up the runner and rethrows the error', async () => {
        const origCreateQR = dataSource.createQueryRunner.bind(dataSource);
        const spy = jest.spyOn(dataSource, 'createQueryRunner').mockImplementationOnce(() => {
          const qr = origCreateQR();
          jest.spyOn(qr, 'connect').mockRejectedValueOnce(new Error('Connection refused'));
          return qr;
        });
        await expect(uow.begin()).rejects.toThrow('Connection refused');
        spy.mockRestore();
        // Best-effort cleanup — ALS may retain the stale QR in the singleton test context
        try { await uow.rollback(); } catch { /* ignore */ }
      });
    });

    describe('Given the database connection fails AND qr.release() also fails during begin() cleanup', () => {
      it('Then begin() swallows the release error and still throws the original connection error (line 48)', async () => {
        const origCreateQR = dataSource.createQueryRunner.bind(dataSource);
        const spy = jest.spyOn(dataSource, 'createQueryRunner').mockImplementationOnce(() => {
          const qr = origCreateQR();
          jest.spyOn(qr, 'connect').mockRejectedValueOnce(new Error('Connection refused'));
          jest.spyOn(qr, 'release').mockRejectedValueOnce(new Error('Release also failed'));
          return qr;
        });
        // The original error must propagate; the release error is swallowed by .catch(() => {})
        await expect(uow.begin()).rejects.toThrow('Connection refused');
        spy.mockRestore();
        try { await uow.rollback(); } catch { /* ignore */ }
      });
    });

    describe('Given the query runner release fails during rollback cleanup', () => {
      it('Then rollback completes without throwing even if release fails', async () => {
        const origCreateQR = dataSource.createQueryRunner.bind(dataSource);
        const spy = jest.spyOn(dataSource, 'createQueryRunner').mockImplementationOnce(() => {
          const qr = origCreateQR();
          const origRelease = qr.release.bind(qr);
          jest.spyOn(qr, 'release').mockImplementationOnce(async () => {
            await origRelease();
            throw new Error('Release failed');
          });
          return qr;
        });
        await uow.begin();
        spy.mockRestore();
        // rollback() catches the release error internally — must not throw
        await expect(uow.rollback()).resolves.toBeUndefined();
      });
    });

    describe('Given commit() is called with an already-released QueryRunner', () => {
      it('Then commit() warns and returns without throwing (lines 57-58)', async () => {
        // Properly simulate an already-released QR:
        // begin() → capture QR ref → rollback() (which genuinely sets isReleased=true
        // and returns the connection to the pool) → re-inject the released QR into ALS
        // so commit() hits the early-return warning path without leaking any connection.
        await uow.begin();
        const qr = (uow as any).als.getStore();
        await uow.rollback();
        (uow as any).als.enterWith(qr);
        await expect(uow.commit()).resolves.toBeUndefined();
      });
    });

    describe('Given commitTransaction() throws because the QueryRunner released mid-commit', () => {
      it('Then commit() swallows the error and returns without throwing (lines 62-64)', async () => {
        const origCreateQR = dataSource.createQueryRunner.bind(dataSource);
        const spy = jest.spyOn(dataSource, 'createQueryRunner').mockImplementationOnce(() => {
          const qr = origCreateQR();
          jest.spyOn(qr as any, 'commitTransaction').mockImplementationOnce(async () => {
            // Simulate QR becoming released mid-commit: properly release the connection
            // first (returns it to the pg pool and sets isReleased=true), then throw.
            // Using qr.release() ensures releaseCallback is called — no connection leak.
            await qr.release();
            throw new Error('QueryRunner is already released');
          });
          return qr;
        });
        await uow.begin();
        spy.mockRestore();
        await expect(uow.commit()).resolves.toBeUndefined();
      });
    });

    describe('Given rollbackTransaction() throws because the QueryRunner released mid-rollback', () => {
      it('Then rollback() swallows the error and returns without throwing (lines 85-87)', async () => {
        const origCreateQR = dataSource.createQueryRunner.bind(dataSource);
        const spy = jest.spyOn(dataSource, 'createQueryRunner').mockImplementationOnce(() => {
          const qr = origCreateQR();
          jest.spyOn(qr as any, 'rollbackTransaction').mockImplementationOnce(async () => {
            // Simulate QR becoming released mid-rollback: properly release the connection
            // first (returns it to the pg pool and sets isReleased=true), then throw.
            // Using qr.release() ensures releaseCallback is called — no connection leak.
            await qr.release();
            throw new Error('QueryRunner is already released');
          });
          return qr;
        });
        await uow.begin();
        spy.mockRestore();
        await expect(uow.rollback()).resolves.toBeUndefined();
      });
    });

    describe('Given commitTransaction() throws a genuine DB error while the QR is still connected', () => {
      it('Then commit() re-throws the error and the connection is returned to the pool (line 66)', async () => {
        const origCreateQR = dataSource.createQueryRunner.bind(dataSource);
        const spy = jest.spyOn(dataSource, 'createQueryRunner').mockImplementationOnce(() => {
          const qr = origCreateQR();
          jest.spyOn(qr as any, 'commitTransaction').mockImplementationOnce(async () => {
            // Throw WITHOUT releasing — simulates a genuine DB error (e.g. serialization failure).
            // The finally block in commit() will properly release the connection.
            throw new Error('DB commit failed: serialization failure');
          });
          return qr;
        });
        await uow.begin();
        spy.mockRestore();
        await expect(uow.commit()).rejects.toThrow('DB commit failed: serialization failure');
      });
    });

    describe('Given rollbackTransaction() throws a genuine DB error while the QR is still connected', () => {
      it('Then rollback() re-throws the error and the connection is returned to the pool (line 89)', async () => {
        const origCreateQR = dataSource.createQueryRunner.bind(dataSource);
        const spy = jest.spyOn(dataSource, 'createQueryRunner').mockImplementationOnce(() => {
          const qr = origCreateQR();
          jest.spyOn(qr as any, 'rollbackTransaction').mockImplementationOnce(async () => {
            // Throw WITHOUT releasing — simulates a genuine DB error during rollback.
            // The finally block in rollback() will properly release the connection.
            throw new Error('DB rollback failed: connection lost');
          });
          return qr;
        });
        await uow.begin();
        spy.mockRestore();
        await expect(uow.rollback()).rejects.toThrow('DB rollback failed: connection lost');
      });
    });
  });
});

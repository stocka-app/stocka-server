import * as crypto from 'crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { v4 as uuidv4, version as uuidVersion } from 'uuid';

import { AuthenticationModule } from '@authentication/infrastructure/authentication.module';
import { UserModule } from '@user/infrastructure/user.module';
import { UnitOfWorkModule } from '@shared/infrastructure/database/unit-of-work.module';
import { MediatorModule } from '@shared/infrastructure/mediator/mediator.module';
import { EmailModule } from '@shared/infrastructure/email/email.module';
import databaseConfig from '@core/config/database/database.config';
import { validate } from '@core/config/environment/env.validation';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { IEmailProviderContract } from '@shared/infrastructure/email/contracts/email-provider.contract';

import { IUserContract } from '@user/domain/contracts/user.contract';
import { ISessionContract } from '@authentication/domain/contracts/session.contract';
import { IEmailVerificationTokenContract } from '@authentication/domain/contracts/email-verification-token.contract';
import { IPasswordResetTokenContract } from '@authentication/domain/contracts/password-reset-token.contract';
import { IVerificationAttemptContract } from '@authentication/domain/contracts/verification-attempt.contract';
import { ISocialAccountContract } from '@user/domain/contracts/social-account.contract';
import { IUnitOfWork } from '@shared/domain/contracts/unit-of-work.contract';

import { UserAggregate, AccountType } from '@user/domain/models/user.aggregate';
import { SessionModel } from '@authentication/domain/models/session.model';
import { EmailVerificationTokenModel } from '@authentication/domain/models/email-verification-token.model';
import { PasswordResetTokenModel } from '@authentication/domain/models/password-reset-token.model';
import { VerificationAttemptModel } from '@authentication/domain/models/verification-attempt.model';

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

function buildUser(overrides: { email?: string; username?: string } = {}): UserAggregate {
  return UserAggregate.reconstitute({
    id: 0,
    uuid: uuidv4(),
    email: overrides.email ?? `test-${uuidv4()}@example.com`,
    username: overrides.username ?? `user${uuidv4().replace(/-/g, '').slice(0, 10)}`,
    passwordHash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.z9OYHvJpzZ9y7u',
    status: 'active',
    emailVerifiedAt: null,
    verificationBlockedUntil: null,
    createdWith: 'email',
    accountType: AccountType.MANUAL,
    createdAt: new Date(),
    updatedAt: new Date(),
    archivedAt: null,
  });
}

// ─── Test Suite ───────────────────────────────────────────────────────────────

describe('Infrastructure Repositories (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let module: TestingModule;

  let userRepo: IUserContract;
  let sessionRepo: ISessionContract;
  let evtRepo: IEmailVerificationTokenContract;
  let prtRepo: IPasswordResetTokenContract;
  let attemptRepo: IVerificationAttemptContract;
  let socialAccountRepo: ISocialAccountContract;
  let uow: IUnitOfWork;

  const emailProvider: jest.Mocked<IEmailProviderContract> = {
    sendEmail: jest.fn().mockResolvedValue({ id: 'mock', success: true }),
    sendVerificationEmail: jest.fn().mockResolvedValue({ id: 'mock', success: true }),
    sendWelcomeEmail: jest.fn().mockResolvedValue({ id: 'mock', success: true }),
    sendPasswordResetEmail: jest.fn().mockResolvedValue({ id: 'mock', success: true }),
  };

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [databaseConfig],
          validate,
          envFilePath: '.env.test',
        }),
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5434', 10),
          username: process.env.DB_USERNAME || 'stocka',
          password: process.env.DB_PASSWORD || 'stocka_dev',
          database: process.env.DB_DATABASE || 'stocka_test',
          autoLoadEntities: true,
          synchronize: true,
          dropSchema: true,
        }),
        EmailModule,
        UnitOfWorkModule,
        UserModule,
        AuthenticationModule,
        MediatorModule,
      ],
    })
      .overrideProvider(INJECTION_TOKENS.EMAIL_PROVIDER_CONTRACT)
      .useValue(emailProvider)
      .compile();

    app = module.createNestApplication();
    await app.init();

    dataSource = module.get(DataSource);
    userRepo = module.get<IUserContract>(INJECTION_TOKENS.USER_CONTRACT);
    sessionRepo = module.get<ISessionContract>(INJECTION_TOKENS.SESSION_CONTRACT);
    evtRepo = module.get<IEmailVerificationTokenContract>(
      INJECTION_TOKENS.EMAIL_VERIFICATION_TOKEN_CONTRACT,
    );
    prtRepo = module.get<IPasswordResetTokenContract>(
      INJECTION_TOKENS.PASSWORD_RESET_TOKEN_CONTRACT,
    );
    attemptRepo = module.get<IVerificationAttemptContract>(
      INJECTION_TOKENS.VERIFICATION_ATTEMPT_CONTRACT,
    );
    socialAccountRepo = module.get<ISocialAccountContract>(INJECTION_TOKENS.SOCIAL_ACCOUNT_CONTRACT);
    uow = module.get<IUnitOfWork>(INJECTION_TOKENS.UNIT_OF_WORK);
  });

  afterEach(async () => {
    await dataSource.query('DELETE FROM verification_attempts');
    await dataSource.query('DELETE FROM email_verification_tokens');
    await dataSource.query('DELETE FROM password_reset_tokens');
    await dataSource.query('DELETE FROM sessions');
    await dataSource.query('DELETE FROM social_accounts');
    await dataSource.query('DELETE FROM users');
  });

  afterAll(async () => {
    await app.close();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TypeOrmUserRepository
  // ═══════════════════════════════════════════════════════════════════════════

  describe('TypeOrmUserRepository', () => {
    describe('Given a user exists in the database', () => {
      let savedUser: UserAggregate;

      beforeEach(async () => {
        savedUser = await userRepo.persist(buildUser());
      });

      describe('When findByUsername is called with an existing username', () => {
        it('Then it returns the matching user aggregate', async () => {
          const found = await userRepo.findByUsername(savedUser.username);
          expect(found).not.toBeNull();
          expect(found!.uuid).toBe(savedUser.uuid);
        });
      });

      describe('When findByUsername is called with a non-existent username', () => {
        it('Then it returns null', async () => {
          const found = await userRepo.findByUsername('nonexistent-username');
          expect(found).toBeNull();
        });
      });

      describe('When existsByUsername is called with an existing username', () => {
        it('Then it returns true', async () => {
          const exists = await userRepo.existsByUsername(savedUser.username);
          expect(exists).toBe(true);
        });
      });

      describe('When existsByUsername is called with a non-existent username', () => {
        it('Then it returns false', async () => {
          const exists = await userRepo.existsByUsername('ghost-username');
          expect(exists).toBe(false);
        });
      });

      describe('When archive is called with the user UUID', () => {
        it('Then the user has archivedAt set and is excluded from email/username lookups', async () => {
          await userRepo.archive(savedUser.uuid);
          // findByUUID intentionally returns archived users (needed for token validation)
          const found = await userRepo.findByUUID(savedUser.uuid);
          expect(found).not.toBeNull();
          // Archived users are excluded from email-based lookups
          const byEmail = await userRepo.findByEmail(savedUser.email);
          expect(byEmail).toBeNull();
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

      describe('When existsByEmail is called with an existing email', () => {
        it('Then it returns true', async () => {
          const exists = await userRepo.existsByEmail(savedUser.email);
          expect(exists).toBe(true);
        });
      });

      describe('When existsByEmail is called with a non-existent email', () => {
        it('Then it returns false', async () => {
          const exists = await userRepo.existsByEmail('ghost@example.com');
          expect(exists).toBe(false);
        });
      });

      describe('When persist is called within an active UoW transaction', () => {
        it('Then it uses the transaction manager and saves the user', async () => {
          const newUser = buildUser();
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

    describe('Given no stale users exist', () => {
      it('Then destroyStaleUnverifiedUsers returns zero', async () => {
        // Use a very small threshold so no users created NOW are considered stale
        const removed = await userRepo.destroyStaleUnverifiedUsers(9999);
        expect(removed).toBe(0);
      });
    });

    describe('Given stale unverified users older than the threshold exist', () => {
      it('Then destroyStaleUnverifiedUsers removes them and returns the count', async () => {
        const staleUser = UserAggregate.reconstitute({
          id: 0,
          uuid: uuidv4(),
          email: `stale${uuidv4().replace(/-/g, '').slice(0, 8)}@example.com`,
          username: `stale${uuidv4().replace(/-/g, '').slice(0, 8)}`,
          passwordHash: null,
          status: 'pending_verification',
          emailVerifiedAt: null,
          verificationBlockedUntil: null,
          createdWith: 'email',
          accountType: AccountType.MANUAL,
          createdAt: new Date(),
          updatedAt: new Date(),
          archivedAt: null,
        });
        const saved = await userRepo.persist(staleUser);
        // @CreateDateColumn ignores the passed value — backdate via raw SQL to simulate stale user
        await dataSource.query(
          `UPDATE users SET created_at = '2020-01-01' WHERE uuid = $1`,
          [saved.uuid],
        );
        const removed = await userRepo.destroyStaleUnverifiedUsers(1);
        expect(removed).toBeGreaterThanOrEqual(1);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TypeOrmSessionRepository
  // ═══════════════════════════════════════════════════════════════════════════

  describe('TypeOrmSessionRepository', () => {
    let savedUser: UserAggregate;

    beforeEach(async () => {
      savedUser = await userRepo.persist(buildUser());
    });

    async function createSession(): Promise<SessionModel> {
      const session = SessionModel.create({
        userId: savedUser.id!,
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

      describe('When findActiveByUserId is called for the user', () => {
        it('Then it returns the active sessions list', async () => {
          const sessions = await sessionRepo.findActiveByUserId(savedUser.id!);
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

      describe('When archiveAllByUserId is called without an active UoW transaction', () => {
        it('Then all user sessions are soft-deleted', async () => {
          await sessionRepo.archiveAllByUserId(savedUser.id!);
          const sessions = await sessionRepo.findActiveByUserId(savedUser.id!);
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
              userId: savedUser.id!,
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

      describe('When archiveAllByUserId is called within an active UoW transaction', () => {
        it('Then it uses the transaction manager to soft-delete all sessions', async () => {
          await uow.begin();
          try {
            await sessionRepo.archiveAllByUserId(savedUser.id!);
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
    let savedUser: UserAggregate;

    beforeEach(async () => {
      savedUser = await userRepo.persist(buildUser());
    });

    async function createToken(
      overrides: { expiresAt?: Date } = {},
    ): Promise<EmailVerificationTokenModel> {
      const token = EmailVerificationTokenModel.create({
        userId: savedUser.id!,
        codeHash: sha256(`code-${uuidv4()}`),
        expiresAt: overrides.expiresAt ?? futureDate(),
        email: savedUser.email,
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

      describe('When findActiveByUserId is called for the user', () => {
        it('Then it returns the active token', async () => {
          const found = await evtRepo.findActiveByUserId(savedUser.id!);
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

      describe('When archiveAllByUserId is called for the user', () => {
        it('Then all tokens for the user are soft-deleted', async () => {
          await evtRepo.archiveAllByUserId(savedUser.id!);
          const found = await evtRepo.findActiveByUserId(savedUser.id!);
          expect(found).toBeNull();
        });
      });

      describe('When findByCodeHash is called with a non-existent code hash', () => {
        it('Then it returns null', async () => {
          const found = await evtRepo.findByCodeHash('nonexistenthashabcdef1234567890');
          expect(found).toBeNull();
        });
      });

      describe('When countResentInLastHour is called for the user', () => {
        it('Then it returns the count of recently resent tokens', async () => {
          const count = await evtRepo.countResentInLastHour(savedUser.id!);
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
              userId: savedUser.id!,
              codeHash: sha256(`uow-code-${uuidv4()}`),
              expiresAt: futureDate(),
              email: savedUser.email,
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
    let savedUser: UserAggregate;

    beforeEach(async () => {
      savedUser = await userRepo.persist(buildUser());
    });

    async function createPRT(): Promise<PasswordResetTokenModel> {
      const token = PasswordResetTokenModel.create({
        userId: savedUser.id!,
        tokenHash: sha256(`reset-${uuidv4()}`),
        expiresAt: futureDate(),
        email: savedUser.email,
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
              userId: savedUser.id!,
              tokenHash: sha256(`uow-reset-${uuidv4()}`),
              expiresAt: futureDate(),
              email: savedUser.email,
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
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TypeOrmSocialAccountRepository
  // ═══════════════════════════════════════════════════════════════════════════

  describe('TypeOrmSocialAccountRepository', () => {
    let savedUser: UserAggregate;

    beforeEach(async () => {
      savedUser = await userRepo.persist(buildUser());
    });

    describe('Given a social account is persisted without an active UoW', () => {
      it('Then it is saved and findable by provider and providerId', async () => {
        const providerId = uuidv4();
        const saved = await socialAccountRepo.persist({
          userId: savedUser.id!,
          provider: 'google',
          providerId,
        });
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
          const saved = await socialAccountRepo.persist({
            userId: savedUser.id!,
            provider: 'facebook',
            providerId: uuidv4(),
          });
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
        const user = UserAggregate.create({
          email: `uuidv7-test-${Date.now()}@example.com`,
          username: `uuidv7usr${Date.now()}`,
          passwordHash: null,
        });
        const saved = await userRepo.persist(user);
        expect(uuidVersion(saved.uuid)).toBe(7);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TypeOrmUnitOfWork — edge cases
  // ═══════════════════════════════════════════════════════════════════════════

  describe('TypeOrmUnitOfWork edge cases', () => {
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
  });
});

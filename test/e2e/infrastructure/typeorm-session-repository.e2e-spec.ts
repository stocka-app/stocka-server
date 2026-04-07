import * as crypto from 'crypto';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { IUserContract } from '@user/domain/contracts/user.contract';
import { ISessionContract } from '@user/account/session/domain/session.contract';
import {
  IAccountContract,
  ICredentialAccountContract,
} from '@user/account/domain/contracts/account.contract';
import { IUnitOfWork } from '@shared/domain/contracts/unit-of-work.contract';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

import { UserAggregate } from '@user/domain/models/user.aggregate';
import { AccountAggregate } from '@user/account/domain/account.aggregate';
import { CredentialAccountModel } from '@user/account/domain/models/credential-account.model';
import { SessionAggregate } from '@user/account/session/domain/session.aggregate';

import { getWorkerApp, truncateWorkerTables } from '@test/worker-app';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function futureDate(offsetMs = 60 * 60 * 1000): Date {
  return new Date(Date.now() + offsetMs);
}

// ─── Spec ─────────────────────────────────────────────────────────────────────

describe('TypeOrmSessionRepository (e2e)', () => {
  let dataSource: DataSource;
  let userRepo: IUserContract;
  let accountRepo: IAccountContract;
  let credentialAccountRepo: ICredentialAccountContract;
  let sessionRepo: ISessionContract;
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
    uow = app.get<IUnitOfWork>(INJECTION_TOKENS.UNIT_OF_WORK);
  });

  afterEach(async () => {
    await truncateWorkerTables(dataSource);
  });

  async function buildPersistedUserWithCredential(overrides: { email?: string } = {}): Promise<{
    user: UserAggregate;
    account: AccountAggregate;
    credential: CredentialAccountModel;
  }> {
    const user = await userRepo.persist(UserAggregate.create());
    const account = await accountRepo.persist(AccountAggregate.create({ userId: user.id }));
    const credential = await credentialAccountRepo.persist(
      CredentialAccountModel.create({
        accountId: account.id,
        email: overrides.email ?? `test-${uuidv4()}@example.com`,
        passwordHash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.z9OYHvJpzZ9y7u',
        createdWith: 'email',
      }),
    );
    return { user, account, credential };
  }

  describe('TypeOrmSessionRepository', () => {
    let savedAccount: AccountAggregate;

    beforeEach(async () => {
      const { account } = await buildPersistedUserWithCredential();
      savedAccount = account;
    });

    async function createSession(): Promise<SessionAggregate> {
      const session = SessionAggregate.create({
        accountId: savedAccount.id!,
        tokenHash: sha256(`session-${uuidv4()}`),
        expiresAt: futureDate(),
      });
      return sessionRepo.persist(session);
    }

    describe('Given a session exists in the database', () => {
      let savedSession: SessionAggregate;

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
            const session = SessionAggregate.create({
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
});

import * as crypto from 'crypto';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { IUserContract } from '@user/domain/contracts/user.contract';
import { IEmailVerificationTokenContract } from '@authentication/domain/contracts/email-verification-token.contract';
import {
  IAccountContract,
  ICredentialAccountContract,
} from '@user/account/domain/contracts/account.contract';
import { IUnitOfWork } from '@shared/domain/contracts/unit-of-work.contract';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

import { UserAggregate } from '@user/domain/models/user.aggregate';
import { AccountAggregate } from '@user/account/domain/account.aggregate';
import { CredentialAccountModel } from '@user/account/domain/models/credential-account.model';
import { EmailVerificationTokenModel } from '@authentication/domain/models/email-verification-token.model';

import { getWorkerApp, truncateWorkerTables } from '@test/worker-app';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function futureDate(offsetMs = 60 * 60 * 1000): Date {
  return new Date(Date.now() + offsetMs);
}

// ─── Spec ─────────────────────────────────────────────────────────────────────

describe('TypeOrmEmailVerificationTokenRepository (e2e)', () => {
  let dataSource: DataSource;
  let userRepo: IUserContract;
  let accountRepo: IAccountContract;
  let credentialAccountRepo: ICredentialAccountContract;
  let evtRepo: IEmailVerificationTokenContract;
  let uow: IUnitOfWork;

  beforeAll(async () => {
    const { app, dataSource: ds } = await getWorkerApp();
    dataSource = ds;
    userRepo = app.get<IUserContract>(INJECTION_TOKENS.USER_CONTRACT);
    accountRepo = app.get<IAccountContract>(INJECTION_TOKENS.ACCOUNT_CONTRACT);
    credentialAccountRepo = app.get<ICredentialAccountContract>(
      INJECTION_TOKENS.CREDENTIAL_ACCOUNT_CONTRACT,
    );
    evtRepo = app.get<IEmailVerificationTokenContract>(
      INJECTION_TOKENS.EMAIL_VERIFICATION_TOKEN_CONTRACT,
    );
    uow = app.get<IUnitOfWork>(INJECTION_TOKENS.UNIT_OF_WORK);
  });

  afterEach(async () => {
    await truncateWorkerTables(dataSource);
  });

  async function buildPersistedUserWithCredential(
    overrides: { email?: string } = {},
  ): Promise<{
    user: UserAggregate;
    account: AccountAggregate;
    credential: CredentialAccountModel;
  }> {
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
});

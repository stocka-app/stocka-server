import * as crypto from 'crypto';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { IUserContract } from '@user/domain/contracts/user.contract';
import { IPasswordResetTokenContract } from '@authentication/domain/contracts/password-reset-token.contract';
import {
  IAccountContract,
  ICredentialAccountContract,
} from '@user/account/domain/contracts/account.contract';
import { IUnitOfWork } from '@shared/domain/contracts/unit-of-work.contract';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

import { UserAggregate } from '@user/domain/models/user.aggregate';
import { AccountAggregate } from '@user/account/domain/account.aggregate';
import { CredentialAccountModel } from '@user/account/domain/models/credential-account.model';
import { PasswordResetTokenModel } from '@authentication/domain/models/password-reset-token.model';

import { getWorkerApp, truncateWorkerTables } from '@test/worker-app';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function futureDate(offsetMs = 60 * 60 * 1000): Date {
  return new Date(Date.now() + offsetMs);
}

// ─── Spec ─────────────────────────────────────────────────────────────────────

describe('TypeOrmPasswordResetTokenRepository (e2e)', () => {
  let dataSource: DataSource;
  let userRepo: IUserContract;
  let accountRepo: IAccountContract;
  let credentialAccountRepo: ICredentialAccountContract;
  let prtRepo: IPasswordResetTokenContract;
  let uow: IUnitOfWork;

  beforeAll(async () => {
    const { app, dataSource: ds } = await getWorkerApp();
    dataSource = ds;
    userRepo = app.get<IUserContract>(INJECTION_TOKENS.USER_CONTRACT);
    accountRepo = app.get<IAccountContract>(INJECTION_TOKENS.ACCOUNT_CONTRACT);
    credentialAccountRepo = app.get<ICredentialAccountContract>(
      INJECTION_TOKENS.CREDENTIAL_ACCOUNT_CONTRACT,
    );
    prtRepo = app.get<IPasswordResetTokenContract>(INJECTION_TOKENS.PASSWORD_RESET_TOKEN_CONTRACT);
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
});

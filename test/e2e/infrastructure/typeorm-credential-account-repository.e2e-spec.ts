import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { IUserContract } from '@user/domain/contracts/user.contract';
import {
  IAccountContract,
  ICredentialAccountContract,
} from '@user/account/domain/contracts/account.contract';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

import { UserAggregate } from '@user/domain/models/user.aggregate';
import { AccountAggregate } from '@user/account/domain/account.aggregate';
import { CredentialAccountModel } from '@user/account/domain/models/credential-account.model';

import { getWorkerApp, truncateWorkerTables } from '@test/worker-app';

// ─── Spec ─────────────────────────────────────────────────────────────────────

describe('TypeOrmCredentialAccountRepository (e2e)', () => {
  let dataSource: DataSource;
  let userRepo: IUserContract;
  let accountRepo: IAccountContract;
  let credentialAccountRepo: ICredentialAccountContract;

  beforeAll(async () => {
    const { app, dataSource: ds } = await getWorkerApp();
    dataSource = ds;
    userRepo = app.get<IUserContract>(INJECTION_TOKENS.USER_CONTRACT);
    accountRepo = app.get<IAccountContract>(INJECTION_TOKENS.ACCOUNT_CONTRACT);
    credentialAccountRepo = app.get<ICredentialAccountContract>(
      INJECTION_TOKENS.CREDENTIAL_ACCOUNT_CONTRACT,
    );
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

  describe('Given a user with a credential account exists in the database', () => {
    let savedUser: UserAggregate;
    let savedAccount: AccountAggregate;
    let savedCredential: CredentialAccountModel;
    let testEmail: string;

    beforeEach(async () => {
      testEmail = `test-${uuidv4()}@example.com`;
      ({
        user: savedUser,
        account: savedAccount,
        credential: savedCredential,
      } = await buildPersistedUserWithCredential({ email: testEmail }));
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

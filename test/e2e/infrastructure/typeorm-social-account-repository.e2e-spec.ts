import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { IUserContract } from '@user/domain/contracts/user.contract';
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

import { getWorkerApp, truncateWorkerTables } from '@test/worker-app';

// ─── Spec ─────────────────────────────────────────────────────────────────────

describe('TypeOrmSocialAccountRepository (e2e)', () => {
  let dataSource: DataSource;
  let userRepo: IUserContract;
  let accountRepo: IAccountContract;
  let credentialAccountRepo: ICredentialAccountContract;
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
    socialAccountRepo = app.get<ISocialAccountContract>(INJECTION_TOKENS.SOCIAL_ACCOUNT_CONTRACT);
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
});

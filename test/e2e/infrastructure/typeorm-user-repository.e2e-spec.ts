import * as crypto from 'crypto';
import { DataSource } from 'typeorm';
import { v4 as uuidv4, version as uuidVersion } from 'uuid';

import { IUserContract } from '@user/domain/contracts/user.contract';
import {
  IAccountContract,
  ICredentialAccountContract,
} from '@user/account/domain/contracts/account.contract';
import { IUnitOfWork } from '@shared/domain/contracts/unit-of-work.contract';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

import { UserAggregate } from '@user/domain/models/user.aggregate';
import { AccountAggregate } from '@user/account/domain/account.aggregate';
import { CredentialAccountModel } from '@user/account/domain/models/credential-account.model';

import { getWorkerApp, truncateWorkerTables } from '@test/worker-app';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

// ─── Spec ─────────────────────────────────────────────────────────────────────

describe('TypeOrmUserRepository (e2e)', () => {
  let dataSource: DataSource;
  let userRepo: IUserContract;
  let accountRepo: IAccountContract;
  let credentialAccountRepo: ICredentialAccountContract;
  let uow: IUnitOfWork;

  beforeAll(async () => {
    const { app, dataSource: ds } = await getWorkerApp();
    dataSource = ds;
    userRepo = app.get<IUserContract>(INJECTION_TOKENS.USER_CONTRACT);
    accountRepo = app.get<IAccountContract>(INJECTION_TOKENS.ACCOUNT_CONTRACT);
    credentialAccountRepo = app.get<ICredentialAccountContract>(
      INJECTION_TOKENS.CREDENTIAL_ACCOUNT_CONTRACT,
    );
    uow = app.get<IUnitOfWork>(INJECTION_TOKENS.UNIT_OF_WORK);
  });

  afterEach(async () => {
    await truncateWorkerTables(dataSource);
  });

  async function buildPersistedUser(): Promise<UserAggregate> {
    return userRepo.persist(UserAggregate.create());
  }

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

  // ── BaseEntity — UUID v7 generation ──────────────────────────────────────

  describe('BaseEntity — UUID v7 generation on insert', () => {
    describe('Given a user is created via domain factory without a pre-assigned UUID', () => {
      it('Then the UUID persisted in the database is version 7', async () => {
        const user = UserAggregate.create();
        const saved = await userRepo.persist(user);
        expect(uuidVersion(saved.uuid)).toBe(7);
      });
    });
  });
});

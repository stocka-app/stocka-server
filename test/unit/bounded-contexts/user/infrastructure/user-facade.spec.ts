import { Test, TestingModule } from '@nestjs/testing';
import { UserFacade } from '@user/infrastructure/facade/user.facade';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { IUserContract } from '@user/domain/contracts/user.contract';
import {
  IAccountContract,
  ICredentialAccountContract,
  ISocialAccountContract,
} from '@user/account/domain/contracts/account.contract';
import { IProfileContract } from '@user/profile/domain/contracts/profile.contract';
import { UserAggregate } from '@user/domain/models/user.aggregate';
import { AccountAggregate } from '@user/account/domain/account.aggregate';
import { CredentialAccountModel } from '@user/account/domain/models/credential-account.model';
import { SocialAccountModel } from '@user/account/domain/models/social-account.model';
import { UserMother, CredentialAccountMother } from '@test/helpers/object-mother/user.mother';

// ── Helpers ────────────────────────────────────────────────────────────────────

function buildPersistedAccount(userId = 1): AccountAggregate {
  return AccountAggregate.reconstitute({
    id: 10,
    uuid: '770a0622-041d-4bf6-a938-668877662222',
    userId,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    archivedAt: null,
  });
}

function buildSocialAccount(accountId = 10): SocialAccountModel {
  return SocialAccountModel.create({
    accountId,
    provider: 'google',
    providerId: 'google-id-123',
  });
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('UserFacade', () => {
  let facade: UserFacade;
  let userContract: jest.Mocked<IUserContract>;
  let accountContract: jest.Mocked<IAccountContract>;
  let credentialAccountContract: jest.Mocked<ICredentialAccountContract>;
  let socialAccountContract: jest.Mocked<ISocialAccountContract>;
  let profileContract: jest.Mocked<IProfileContract>;

  beforeEach(async () => {
    userContract = {
      persist: jest.fn(),
      findById: jest.fn(),
      findByUUID: jest.fn(),
      existsByUsername: jest.fn(),
      archive: jest.fn(),
      destroy: jest.fn(),
    } as unknown as jest.Mocked<IUserContract>;

    accountContract = {
      findById: jest.fn(),
      findByUserId: jest.fn(),
      persist: jest.fn(),
    } as unknown as jest.Mocked<IAccountContract>;

    credentialAccountContract = {
      findById: jest.fn(),
      findByAccountId: jest.fn(),
      findByEmail: jest.fn(),
      findByEmailOrUsername: jest.fn(),
      persist: jest.fn(),
      archiveByAccountId: jest.fn(),
    } as unknown as jest.Mocked<ICredentialAccountContract>;

    socialAccountContract = {
      findByAccountId: jest.fn(),
      findByProviderAndProviderId: jest.fn(),
      persist: jest.fn(),
    } as unknown as jest.Mocked<ISocialAccountContract>;

    profileContract = {
      findByUserId: jest.fn(),
      findPersonalProfileByUserId: jest.fn(),
      findPersonalProfileByUsername: jest.fn(),
      persistProfile: jest.fn(),
      persistPersonalProfile: jest.fn(),
      persistCommercialProfile: jest.fn(),
      upsertSocialProfile: jest.fn(),
      findSocialProfileByProfileAndProvider: jest.fn(),
    } as unknown as jest.Mocked<IProfileContract>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserFacade,
        { provide: INJECTION_TOKENS.USER_CONTRACT, useValue: userContract },
        { provide: INJECTION_TOKENS.ACCOUNT_CONTRACT, useValue: accountContract },
        {
          provide: INJECTION_TOKENS.CREDENTIAL_ACCOUNT_CONTRACT,
          useValue: credentialAccountContract,
        },
        { provide: INJECTION_TOKENS.SOCIAL_ACCOUNT_CONTRACT, useValue: socialAccountContract },
        { provide: INJECTION_TOKENS.PROFILE_CONTRACT, useValue: profileContract },
      ],
    }).compile();

    facade = module.get(UserFacade);
  });

  // ── findByUUID ──────────────────────────────────────────────────────────────

  describe('Given findByUUID is called', () => {
    describe('When the user exists', () => {
      it('Then it returns the UserAggregate', async () => {
        const targetUUID = '550e8400-e29b-41d4-a716-446655440001';
        const user = UserMother.create({ uuid: targetUUID });
        userContract.findByUUID.mockResolvedValue(user);

        const result = await facade.findByUUID(targetUUID);

        expect(result?.uuid).toBe(targetUUID);
      });
    });

    describe('When the user does not exist', () => {
      it('Then it returns null', async () => {
        userContract.findByUUID.mockResolvedValue(null);

        const result = await facade.findByUUID('missing-uuid');

        expect(result).toBeNull();
      });
    });
  });

  // ── findByAccountId ─────────────────────────────────────────────────────────

  describe('Given findByAccountId is called', () => {
    describe('When the account and user both exist', () => {
      it('Then it returns the UserAggregate', async () => {
        const user = UserMother.create({ id: 1 });
        accountContract.findById.mockResolvedValue(buildPersistedAccount(1));
        userContract.findById.mockResolvedValue(user);

        const result = await facade.findByAccountId(10);

        expect(result?.id).toBe(1);
      });
    });

    describe('When no account is found for the given id', () => {
      it('Then it returns null', async () => {
        accountContract.findById.mockResolvedValue(null);

        const result = await facade.findByAccountId(999);

        expect(result).toBeNull();
      });
    });
  });

  // ── findUsernameByUUID ──────────────────────────────────────────────────────

  describe('Given findUsernameByUUID is called', () => {
    describe('When the user and profile exist', () => {
      it('Then it returns the username string', async () => {
        const targetUUID = '550e8400-e29b-41d4-a716-446655440002';
        const user = UserMother.create({ id: 1, uuid: targetUUID });
        userContract.findByUUID.mockResolvedValue(user);
        (profileContract.findPersonalProfileByUserId as jest.Mock).mockResolvedValue({
          username: 'tester',
        });

        const result = await facade.findUsernameByUUID(targetUUID);

        expect(result).toBe('tester');
      });
    });

    describe('When no user is found', () => {
      it('Then it returns null', async () => {
        userContract.findByUUID.mockResolvedValue(null);

        const result = await facade.findUsernameByUUID('ghost-uuid');

        expect(result).toBeNull();
      });
    });

    describe('When the user exists but has no personal profile', () => {
      it('Then it returns null', async () => {
        const targetUUID = '550e8400-e29b-41d4-a716-446655440003';
        const user = UserMother.create({ id: 1, uuid: targetUUID });
        userContract.findByUUID.mockResolvedValue(user);
        (profileContract.findPersonalProfileByUserId as jest.Mock).mockResolvedValue(null);

        const result = await facade.findUsernameByUUID(targetUUID);

        expect(result).toBeNull();
      });
    });
  });

  // ── findUserByEmail ─────────────────────────────────────────────────────────

  describe('Given findUserByEmail is called', () => {
    describe('When the email maps to an existing user', () => {
      it('Then it returns the user and credential pair', async () => {
        const mockCredential = CredentialAccountMother.createVerified({
          email: 'user@example.com',
          accountId: 10,
        });
        const mockAccount = buildPersistedAccount(1);
        const mockUser = UserMother.create({ id: 1 });

        credentialAccountContract.findByEmail.mockResolvedValue(mockCredential);
        accountContract.findById.mockResolvedValue(mockAccount);
        userContract.findById.mockResolvedValue(mockUser);

        const result = await facade.findUserByEmail('user@example.com');

        expect(result).not.toBeNull();
        expect(result?.credential.email).toBe('user@example.com');
        expect(result?.user.id).toBe(1);
      });
    });

    describe('When no credential matches the email', () => {
      it('Then it returns null', async () => {
        credentialAccountContract.findByEmail.mockResolvedValue(null);

        const result = await facade.findUserByEmail('nobody@example.com');

        expect(result).toBeNull();
      });
    });

    describe('When the credential is found but the account no longer exists', () => {
      it('Then it returns null', async () => {
        credentialAccountContract.findByEmail.mockResolvedValue(
          CredentialAccountMother.createVerified({ email: 'orphan@example.com', accountId: 99 }),
        );
        accountContract.findById.mockResolvedValue(null);

        const result = await facade.findUserByEmail('orphan@example.com');

        expect(result).toBeNull();
      });
    });

    describe('When the credential and account are found but the user no longer exists', () => {
      it('Then it returns null', async () => {
        credentialAccountContract.findByEmail.mockResolvedValue(
          CredentialAccountMother.createVerified({ email: 'orphan@example.com', accountId: 10 }),
        );
        accountContract.findById.mockResolvedValue(buildPersistedAccount(99));
        userContract.findById.mockResolvedValue(null);

        const result = await facade.findUserByEmail('orphan@example.com');

        expect(result).toBeNull();
      });
    });
  });

  // ── findUserByEmailOrUsername ────────────────────────────────────────────────

  describe('Given findUserByEmailOrUsername is called', () => {
    describe('When the identifier matches an existing user', () => {
      it('Then it returns the user and credential pair', async () => {
        const mockCredential = CredentialAccountMother.createVerified({
          email: 'user@example.com',
          accountId: 10,
        });
        const mockAccount = buildPersistedAccount(1);
        const mockUser = UserMother.create({ id: 1 });

        credentialAccountContract.findByEmailOrUsername.mockResolvedValue(mockCredential);
        accountContract.findById.mockResolvedValue(mockAccount);
        userContract.findById.mockResolvedValue(mockUser);

        const result = await facade.findUserByEmailOrUsername('user@example.com');

        expect(result).not.toBeNull();
        expect(result?.credential.email).toBe('user@example.com');
      });
    });

    describe('When no user matches the identifier', () => {
      it('Then it returns null', async () => {
        credentialAccountContract.findByEmailOrUsername.mockResolvedValue(null);

        const result = await facade.findUserByEmailOrUsername('unknown');

        expect(result).toBeNull();
      });
    });

    describe('When the credential is found but the account no longer exists', () => {
      it('Then it returns null', async () => {
        const mockCredential = CredentialAccountMother.createVerified({ accountId: 10 });
        credentialAccountContract.findByEmailOrUsername.mockResolvedValue(mockCredential);
        accountContract.findById.mockResolvedValue(null);

        const result = await facade.findUserByEmailOrUsername('user@example.com');

        expect(result).toBeNull();
      });
    });

    describe('When the credential and account are found but the user no longer exists', () => {
      it('Then it returns null', async () => {
        const mockCredential = CredentialAccountMother.createVerified({ accountId: 10 });
        const mockAccount = buildPersistedAccount(1);
        credentialAccountContract.findByEmailOrUsername.mockResolvedValue(mockCredential);
        accountContract.findById.mockResolvedValue(mockAccount);
        userContract.findById.mockResolvedValue(null);

        const result = await facade.findUserByEmailOrUsername('user@example.com');

        expect(result).toBeNull();
      });
    });
  });

  // ── existsByUsername ────────────────────────────────────────────────────────

  describe('Given existsByUsername is called', () => {
    describe('When the username exists', () => {
      it('Then it returns true', async () => {
        (profileContract.findPersonalProfileByUsername as jest.Mock).mockResolvedValue({
          username: 'taken',
        });

        const result = await facade.existsByUsername('taken');

        expect(result).toBe(true);
      });
    });

    describe('When the username is available', () => {
      it('Then it returns false', async () => {
        profileContract.findPersonalProfileByUsername.mockResolvedValue(null);

        const result = await facade.existsByUsername('free');

        expect(result).toBe(false);
      });
    });
  });

  // ── existsByEmail ────────────────────────────────────────────────────────────

  describe('Given existsByEmail is called', () => {
    describe('When the email is taken', () => {
      it('Then it returns true', async () => {
        credentialAccountContract.findByEmail.mockResolvedValue(
          CredentialAccountMother.createVerified({ email: 'taken@example.com' }),
        );

        const result = await facade.existsByEmail('taken@example.com');

        expect(result).toBe(true);
      });
    });

    describe('When the email is not in use', () => {
      it('Then it returns false', async () => {
        credentialAccountContract.findByEmail.mockResolvedValue(null);

        const result = await facade.existsByEmail('free@example.com');

        expect(result).toBe(false);
      });
    });
  });

  // ── findUserBySocialProvider ─────────────────────────────────────────────────

  describe('Given findUserBySocialProvider is called', () => {
    describe('When the social account maps to an existing user', () => {
      it('Then it returns the user and social pair', async () => {
        const social = buildSocialAccount(10);
        const mockAccount = buildPersistedAccount(1);
        const mockUser = UserMother.create({ id: 1 });

        socialAccountContract.findByProviderAndProviderId.mockResolvedValue(social);
        accountContract.findById.mockResolvedValue(mockAccount);
        userContract.findById.mockResolvedValue(mockUser);

        const result = await facade.findUserBySocialProvider('google', 'google-id-123');

        expect(result).not.toBeNull();
        expect(result?.user.id).toBe(1);
        expect(result?.social.provider).toBe('google');
      });
    });

    describe('When no social account matches', () => {
      it('Then it returns null', async () => {
        socialAccountContract.findByProviderAndProviderId.mockResolvedValue(null);

        const result = await facade.findUserBySocialProvider('github', 'unknown-id');

        expect(result).toBeNull();
      });
    });

    describe('When the social account is found but the account no longer exists', () => {
      it('Then it returns null', async () => {
        socialAccountContract.findByProviderAndProviderId.mockResolvedValue(buildSocialAccount(10));
        accountContract.findById.mockResolvedValue(null);

        const result = await facade.findUserBySocialProvider('google', 'google-id-123');

        expect(result).toBeNull();
      });
    });

    describe('When the social account and account are found but the user no longer exists', () => {
      it('Then it returns null', async () => {
        socialAccountContract.findByProviderAndProviderId.mockResolvedValue(buildSocialAccount(10));
        accountContract.findById.mockResolvedValue(buildPersistedAccount(1));
        userContract.findById.mockResolvedValue(null);

        const result = await facade.findUserBySocialProvider('google', 'google-id-123');

        expect(result).toBeNull();
      });
    });
  });

  // ── findUserByUUIDWithCredential ─────────────────────────────────────────────

  describe('Given findUserByUUIDWithCredential is called', () => {
    describe('When the UUID maps to a user with credential', () => {
      it('Then it returns the user and credential pair', async () => {
        const uuid = '550e8400-e29b-41d4-a716-446655440099';
        const mockUser = UserMother.create({ id: 1, uuid });
        const mockAccount = buildPersistedAccount(1);
        const mockCredential = CredentialAccountMother.createVerified({
          id: 5,
          accountId: 10,
          email: 'user@example.com',
        });

        userContract.findByUUID.mockResolvedValue(mockUser);
        accountContract.findByUserId.mockResolvedValue(mockAccount);
        credentialAccountContract.findByAccountId.mockResolvedValue(mockCredential);

        const result = await facade.findUserByUUIDWithCredential(uuid);

        expect(result).not.toBeNull();
        expect(result?.user.uuid).toBe(uuid);
        expect(result?.credential.email).toBe('user@example.com');
      });
    });

    describe('When no user is found for the UUID', () => {
      it('Then it returns null', async () => {
        userContract.findByUUID.mockResolvedValue(null);

        const result = await facade.findUserByUUIDWithCredential('missing-uuid');

        expect(result).toBeNull();
      });
    });

    describe('When the user has no account', () => {
      it('Then it returns null', async () => {
        const mockUser = UserMother.create({ id: 1, uuid: '550e8400-e29b-41d4-a716-446655440099' });
        userContract.findByUUID.mockResolvedValue(mockUser);
        accountContract.findByUserId.mockResolvedValue(null);

        const result = await facade.findUserByUUIDWithCredential('any-uuid');

        expect(result).toBeNull();
      });
    });

    describe('When the account has no credential', () => {
      it('Then it returns null', async () => {
        const mockUser = UserMother.create({ id: 1, uuid: '550e8400-e29b-41d4-a716-446655440099' });
        const mockAccount = buildPersistedAccount(1);
        userContract.findByUUID.mockResolvedValue(mockUser);
        accountContract.findByUserId.mockResolvedValue(mockAccount);
        credentialAccountContract.findByAccountId.mockResolvedValue(null);

        const result = await facade.findUserByUUIDWithCredential('any-uuid');

        expect(result).toBeNull();
      });
    });
  });

  // ── createUserWithCredentials ────────────────────────────────────────────────

  describe('Given createUserWithCredentials is called', () => {
    describe('When all downstream contracts succeed', () => {
      it('Then it returns the persisted user and credential', async () => {
        const persistedUser = UserMother.create({
          id: 1,
          uuid: '550e8400-e29b-41d4-a716-446655440003',
        });
        const persistedAccount = buildPersistedAccount(1);
        const persistedCredential = CredentialAccountMother.createPendingVerification({
          id: 5,
          email: 'new@example.com',
          accountId: 10,
        });

        userContract.persist.mockResolvedValue(persistedUser);
        accountContract.persist.mockResolvedValue(persistedAccount);
        credentialAccountContract.persist.mockResolvedValue(persistedCredential);
        (profileContract.persistProfile as jest.Mock).mockResolvedValue({ id: 20 });
        (profileContract.persistPersonalProfile as jest.Mock).mockResolvedValue({});

        const result = await facade.createUserWithCredentials({
          email: 'new@example.com',
          username: 'newuser',
          passwordHash: 'hash123',
        });

        expect(result.user.id).toBe(1);
        expect(result.credential.email).toBe('new@example.com');
        expect(userContract.persist).toHaveBeenCalled();
        expect(credentialAccountContract.persist).toHaveBeenCalled();
      });
    });
  });

  // ── createUserFromOAuth ──────────────────────────────────────────────────────

  describe('Given createUserFromOAuth is called', () => {
    describe('When all downstream contracts succeed', () => {
      it('Then it returns the persisted user, credential, and social', async () => {
        const persistedUser = UserMother.create({ id: 1 });
        const persistedAccount = buildPersistedAccount(1);
        const persistedCredential = CredentialAccountMother.createSocialOnly({
          id: 5,
          email: 'oauth@example.com',
          accountId: 10,
          provider: 'google',
        });
        const persistedSocial = buildSocialAccount(10);

        userContract.persist.mockResolvedValue(persistedUser);
        accountContract.persist.mockResolvedValue(persistedAccount);
        credentialAccountContract.persist.mockResolvedValue(persistedCredential);
        socialAccountContract.persist.mockResolvedValue(persistedSocial);
        (profileContract.persistProfile as jest.Mock).mockResolvedValue({ id: 20 });
        (profileContract.persistPersonalProfile as jest.Mock).mockResolvedValue({});

        const result = await facade.createUserFromOAuth({
          email: 'oauth@example.com',
          username: 'oauthuser',
          provider: 'google',
          providerId: 'google-id-123',
        });

        expect(result.user.id).toBe(1);
        expect(result.credential.email).toBe('oauth@example.com');
        expect(result.social.provider).toBe('google');
      });
    });
  });

  // ── createUserWithCredentials — requireId guard ──────────────────────────────

  describe('Given createUserWithCredentials is called', () => {
    describe('When the persistence layer returns a user with no id assigned', () => {
      it('Then it throws with a descriptive message identifying the failing step', async () => {
        userContract.persist.mockResolvedValue({ id: undefined } as unknown as UserAggregate);

        await expect(
          facade.createUserWithCredentials({
            email: 'fail@example.com',
            username: 'failuser',
            passwordHash: 'hash',
          }),
        ).rejects.toThrow('createUserWithCredentials:user');
      });
    });
  });

  // ── linkSocialAccount ────────────────────────────────────────────────────────

  describe('Given linkSocialAccount is called', () => {
    describe('When the account exists for the user', () => {
      it('Then it persists a new social account and returns it', async () => {
        const mockAccount = buildPersistedAccount(1);
        const persistedSocial = buildSocialAccount(10);

        accountContract.findByUserId.mockResolvedValue(mockAccount);
        socialAccountContract.persist.mockResolvedValue(persistedSocial);

        const result = await facade.linkSocialAccount(1, {
          provider: 'google',
          providerId: 'google-id-123',
        });

        expect(result.provider).toBe('google');
        expect(socialAccountContract.persist).toHaveBeenCalled();
      });
    });

    describe('When no account is found for the user', () => {
      it('Then it throws an error', async () => {
        accountContract.findByUserId.mockResolvedValue(null);

        await expect(
          facade.linkSocialAccount(99, { provider: 'google', providerId: 'gid' }),
        ).rejects.toThrow();
      });
    });
  });

  // ── verifyEmail ──────────────────────────────────────────────────────────────

  describe('Given verifyEmail is called', () => {
    describe('When the credential is found', () => {
      it('Then it verifies the email and persists the updated credential', async () => {
        const credential = CredentialAccountMother.createPendingVerification({ id: 5 });
        credentialAccountContract.findById.mockResolvedValue(credential);
        credentialAccountContract.persist.mockResolvedValue(credential);

        await expect(facade.verifyEmail(5)).resolves.toBeUndefined();

        expect(credentialAccountContract.persist).toHaveBeenCalled();
      });
    });

    describe('When the credential is not found', () => {
      it('Then it throws an error', async () => {
        credentialAccountContract.findById.mockResolvedValue(null);

        await expect(facade.verifyEmail(999)).rejects.toThrow();
      });
    });
  });

  // ── updatePasswordHash ───────────────────────────────────────────────────────

  describe('Given updatePasswordHash is called', () => {
    describe('When the credential is found', () => {
      it('Then it updates the hash and persists the credential', async () => {
        const credential = CredentialAccountMother.createVerified({ id: 5 });
        credentialAccountContract.findById.mockResolvedValue(credential);
        credentialAccountContract.persist.mockResolvedValue(credential);

        await expect(facade.updatePasswordHash(5, 'newhash')).resolves.toBeUndefined();

        expect(credentialAccountContract.persist).toHaveBeenCalled();
      });
    });

    describe('When the credential is not found', () => {
      it('Then it throws an error', async () => {
        credentialAccountContract.findById.mockResolvedValue(null);

        await expect(facade.updatePasswordHash(999, 'newhash')).rejects.toThrow();
      });
    });
  });

  // ── blockVerification ────────────────────────────────────────────────────────

  describe('Given blockVerification is called', () => {
    describe('When the credential is found', () => {
      it('Then it sets the block and persists the credential', async () => {
        const credential = CredentialAccountMother.createPendingVerification({ id: 5 });
        credentialAccountContract.findById.mockResolvedValue(credential);
        credentialAccountContract.persist.mockResolvedValue(credential);

        const until = new Date(Date.now() + 5 * 60 * 1000);
        await expect(facade.blockVerification(5, until)).resolves.toBeUndefined();

        expect(credentialAccountContract.persist).toHaveBeenCalled();
      });
    });

    describe('When the credential is not found', () => {
      it('Then it returns without throwing (soft failure)', async () => {
        credentialAccountContract.findById.mockResolvedValue(null);

        await expect(facade.blockVerification(999, new Date())).resolves.toBeUndefined();
      });
    });
  });

  // ── findDisplayNameByUserUUID ────────────────────────────────────────────────

  describe('Given findDisplayNameByUserUUID is called', () => {
    describe('When the user and profile exist with a displayName', () => {
      it('Then it returns the displayName string', async () => {
        const user = UserMother.create({ id: 1, uuid: '550e8400-e29b-41d4-a716-446655440010' });
        userContract.findByUUID.mockResolvedValue(user);
        (profileContract.findPersonalProfileByUserId as jest.Mock).mockResolvedValue({
          displayName: 'Roberto Medina',
        });

        const result = await facade.findDisplayNameByUserUUID('550e8400-e29b-41d4-a716-446655440010');

        expect(result).toBe('Roberto Medina');
      });
    });

    describe('When the user does not exist', () => {
      it('Then it returns null', async () => {
        userContract.findByUUID.mockResolvedValue(null);

        const result = await facade.findDisplayNameByUserUUID('ghost-uuid');

        expect(result).toBeNull();
      });
    });

    describe('When the profile has no displayName', () => {
      it('Then it returns null', async () => {
        const user = UserMother.create({ id: 1, uuid: '550e8400-e29b-41d4-a716-446655440011' });
        userContract.findByUUID.mockResolvedValue(user);
        (profileContract.findPersonalProfileByUserId as jest.Mock).mockResolvedValue({
          displayName: null,
        });

        const result = await facade.findDisplayNameByUserUUID('550e8400-e29b-41d4-a716-446655440011');

        expect(result).toBeNull();
      });
    });
  });

  // ── upsertSocialProfile ──────────────────────────────────────────────────────

  describe('Given upsertSocialProfile is called', () => {
    const SOCIAL_PROPS = {
      userUUID: '550e8400-e29b-41d4-a716-446655440020',
      socialAccountUUID: 'social-acc-uuid-001',
      provider: 'google',
      providerDisplayName: 'Roberto Medina',
      providerAvatarUrl: null,
      givenName: 'Roberto',
      familyName: 'Medina',
      locale: 'es',
      emailVerified: true,
      jobTitle: null,
      rawData: { sub: 'google-sub-001' },
    };

    describe('When the user and profile exist', () => {
      it('Then it calls profileContract.upsertSocialProfile', async () => {
        const user = UserMother.create({ id: 1, uuid: SOCIAL_PROPS.userUUID });
        const profile = { id: 99 };
        userContract.findByUUID.mockResolvedValue(user);
        (profileContract.findByUserId as jest.Mock).mockResolvedValue(profile);
        (profileContract.upsertSocialProfile as jest.Mock).mockResolvedValue(undefined);

        await expect(facade.upsertSocialProfile(SOCIAL_PROPS)).resolves.toBeUndefined();

        expect(profileContract.upsertSocialProfile).toHaveBeenCalledTimes(1);
      });
    });

    describe('When the user is not found', () => {
      it('Then it throws an error', async () => {
        userContract.findByUUID.mockResolvedValue(null);

        await expect(facade.upsertSocialProfile(SOCIAL_PROPS)).rejects.toThrow(
          'UserFacade.upsertSocialProfile: user not found',
        );
      });
    });

    describe('When the profile is not found for the user', () => {
      it('Then it throws an error', async () => {
        const user = UserMother.create({ id: 1, uuid: SOCIAL_PROPS.userUUID });
        userContract.findByUUID.mockResolvedValue(user);
        (profileContract.findByUserId as jest.Mock).mockResolvedValue(null);

        await expect(facade.upsertSocialProfile(SOCIAL_PROPS)).rejects.toThrow(
          'UserFacade.upsertSocialProfile: profile not found',
        );
      });
    });
  });
});

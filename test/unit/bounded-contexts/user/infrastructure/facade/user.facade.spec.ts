import { UserFacade } from '@user/infrastructure/facade/user.facade';
import { IUserContract } from '@user/domain/contracts/user.contract';
import {
  IAccountContract,
  ICredentialAccountContract,
  ISocialAccountContract,
} from '@user/account/domain/contracts/account.contract';
import { IProfileContract } from '@user/profile/domain/contracts/profile.contract';
import { UserAggregate } from '@user/domain/aggregates/user.aggregate';
import { AccountAggregate } from '@user/account/domain/account.aggregate';
import { CredentialAccountModel } from '@user/account/domain/models/credential-account.model';
import { PersonalProfileModel } from '@user/profile/domain/models/personal-profile.model';
import { ProfileAggregate } from '@user/profile/domain/profile.aggregate';
import { Persisted } from '@shared/domain/contracts/base-repository.contract';
import { asPersisted } from '@test/helpers/persisted';
import { DisplayNameVO } from '@shared/domain/value-objects/display-name.vo';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildUser(id = 42, uuid = 'user-uuid-001'): Persisted<UserAggregate> {
  return asPersisted({ id, uuid } as unknown as UserAggregate, id);
}

function buildAccount(id = 10, userId = 42): Persisted<AccountAggregate> {
  return asPersisted({ id, userId } as unknown as AccountAggregate, id);
}

function buildCredential(
  id = 20,
  accountId = 10,
  email = 'test@example.com',
): Persisted<CredentialAccountModel> {
  return asPersisted(
    {
      id,
      accountId,
      email,
      verifyEmail: jest.fn(),
      blockVerification: jest.fn(),
      updatePasswordHash: jest.fn(),
      requiresEmailVerification: jest.fn().mockReturnValue(true),
    } as unknown as CredentialAccountModel,
    id,
  );
}

function buildPersonalProfile(
  id = 5,
  profileId = 5,
  overrides: { displayName?: string; username?: string; avatarUrl?: string } = {},
): Persisted<PersonalProfileModel> {
  return asPersisted(
    {
      id,
      profileId,
      displayName:
        overrides.displayName != null ? DisplayNameVO.create(overrides.displayName) : null,
      username: overrides.username ?? 'testuser',
      avatarUrl: overrides.avatarUrl ?? null,
      updateLocale: jest.fn(),
    } as unknown as PersonalProfileModel,
    id,
  );
}

function buildProfileAggregate(id = 5, userId = 42): Persisted<ProfileAggregate> {
  return asPersisted({ id, userId } as unknown as ProfileAggregate, id);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('UserFacade', () => {
  let facade: UserFacade;
  let userContract: jest.Mocked<IUserContract>;
  let accountContract: jest.Mocked<IAccountContract>;
  let credentialAccountContract: jest.Mocked<ICredentialAccountContract>;
  let socialAccountContract: jest.Mocked<ISocialAccountContract>;
  let profileContract: jest.Mocked<IProfileContract>;

  beforeEach(() => {
    userContract = {
      findByUUID: jest.fn(),
      findById: jest.fn(),
      persist: jest.fn(),
    } as unknown as jest.Mocked<IUserContract>;

    accountContract = {
      findById: jest.fn(),
      findByUserId: jest.fn(),
      persist: jest.fn(),
    } as unknown as jest.Mocked<IAccountContract>;

    credentialAccountContract = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByEmailOrUsername: jest.fn(),
      findByAccountId: jest.fn(),
      persist: jest.fn(),
    } as unknown as jest.Mocked<ICredentialAccountContract>;

    socialAccountContract = {
      findByProviderAndProviderId: jest.fn(),
      persist: jest.fn(),
    } as unknown as jest.Mocked<ISocialAccountContract>;

    profileContract = {
      findByUserId: jest.fn(),
      findPersonalProfileByUserId: jest.fn(),
      findPersonalProfileByUsername: jest.fn(),
      persistProfile: jest.fn(),
      persistPersonalProfile: jest.fn(),
      upsertSocialProfile: jest.fn(),
      findSocialProfileByProfileAndProvider: jest.fn(),
      findFirstSocialProfileByProfileId: jest.fn(),
    } as unknown as jest.Mocked<IProfileContract>;

    facade = new UserFacade(
      userContract,
      accountContract,
      credentialAccountContract,
      socialAccountContract,
      profileContract,
    );
  });

  // ─── linkSocialAccount ───────────────────────────────────────────────────

  describe('Given linkSocialAccount is called', () => {
    describe('When no account exists for the given userId', () => {
      beforeEach(() => {
        accountContract.findByUserId.mockResolvedValue(null);
      });

      it('Then it throws an error mentioning the userId', async () => {
        await expect(
          facade.linkSocialAccount(999, { provider: 'google', providerId: 'prov-id' }),
        ).rejects.toThrow('no account found for userId=999');
      });
    });

    describe('When an account exists for the userId', () => {
      beforeEach(() => {
        accountContract.findByUserId.mockResolvedValue(buildAccount(10, 999));
        socialAccountContract.persist.mockResolvedValue({
          id: 1,
          accountId: 10,
          provider: 'google',
          providerId: 'prov-id',
        } as unknown as ReturnType<typeof socialAccountContract.persist> extends Promise<infer T>
          ? T
          : never);
      });

      it('Then it creates and persists the social account', async () => {
        await facade.linkSocialAccount(999, { provider: 'google', providerId: 'prov-id' });
        expect(socialAccountContract.persist).toHaveBeenCalled();
      });
    });
  });

  // ─── updateLocale ────────────────────────────────────────────────────────

  describe('Given updateLocale is called', () => {
    describe('When the user is not found', () => {
      beforeEach(() => {
        userContract.findByUUID.mockResolvedValue(null);
      });

      it('Then it returns silently without throwing', async () => {
        await expect(facade.updateLocale('user-uuid-123', 'en')).resolves.toBeUndefined();
        expect(profileContract.findPersonalProfileByUserId).not.toHaveBeenCalled();
      });
    });

    describe('When the user exists and has a personal profile', () => {
      let personalProfile: Persisted<PersonalProfileModel>;

      beforeEach(() => {
        personalProfile = buildPersonalProfile();
        userContract.findByUUID.mockResolvedValue(buildUser(42));
        profileContract.findPersonalProfileByUserId.mockResolvedValue(personalProfile);
        profileContract.persistPersonalProfile.mockResolvedValue(personalProfile);
      });

      it('Then it calls updateLocale on the profile and persists it', async () => {
        await facade.updateLocale('user-uuid-001', 'es');

        expect(personalProfile.updateLocale).toHaveBeenCalledWith('es');
        expect(profileContract.persistPersonalProfile).toHaveBeenCalledWith(personalProfile);
      });
    });
  });

  // ─── verifyEmail ─────────────────────────────────────────────────────────

  describe('Given verifyEmail is called', () => {
    describe('When the credential account is not found', () => {
      beforeEach(() => {
        credentialAccountContract.findById.mockResolvedValue(null);
      });

      it('Then it throws an error mentioning the credentialAccountId', async () => {
        await expect(facade.verifyEmail(999)).rejects.toThrow('credentialAccount not found id=999');
      });
    });

    describe('When the credential account exists', () => {
      let credential: Persisted<CredentialAccountModel>;

      beforeEach(() => {
        credential = buildCredential(20);
        credentialAccountContract.findById.mockResolvedValue(credential);
        credentialAccountContract.persist.mockResolvedValue(credential);
      });

      it('Then it calls verifyEmail and persists the credential', async () => {
        await facade.verifyEmail(20);

        expect(credential.verifyEmail).toHaveBeenCalled();
        expect(credentialAccountContract.persist).toHaveBeenCalledWith(credential);
      });
    });
  });

  // ─── blockVerification ───────────────────────────────────────────────────

  describe('Given blockVerification is called', () => {
    describe('When the credential account is not found', () => {
      beforeEach(() => {
        credentialAccountContract.findById.mockResolvedValue(null);
      });

      it('Then it returns silently without throwing', async () => {
        const until = new Date(Date.now() + 60 * 60 * 1000);
        await expect(facade.blockVerification(999, until)).resolves.toBeUndefined();
        expect(credentialAccountContract.persist).not.toHaveBeenCalled();
      });
    });

    describe('When the credential account exists', () => {
      let credential: Persisted<CredentialAccountModel>;

      beforeEach(() => {
        credential = buildCredential(20);
        credentialAccountContract.findById.mockResolvedValue(credential);
        credentialAccountContract.persist.mockResolvedValue(credential);
      });

      it('Then it calls blockVerification and persists the credential', async () => {
        const until = new Date(Date.now() + 60 * 60 * 1000);
        await facade.blockVerification(20, until);

        expect(credential.blockVerification).toHaveBeenCalledWith(until);
        expect(credentialAccountContract.persist).toHaveBeenCalledWith(credential);
      });
    });
  });

  // ─── updatePasswordHash ──────────────────────────────────────────────────

  describe('Given updatePasswordHash is called', () => {
    describe('When the credential account is not found', () => {
      beforeEach(() => {
        credentialAccountContract.findById.mockResolvedValue(null);
      });

      it('Then it throws an error mentioning the credentialAccountId', async () => {
        await expect(facade.updatePasswordHash(999, 'new-hash')).rejects.toThrow(
          'credentialAccount not found id=999',
        );
      });
    });

    describe('When the credential account exists', () => {
      let credential: Persisted<CredentialAccountModel>;

      beforeEach(() => {
        credential = buildCredential(20);
        credentialAccountContract.findById.mockResolvedValue(credential);
        credentialAccountContract.persist.mockResolvedValue(credential);
      });

      it('Then it updates the password hash and persists the credential', async () => {
        await facade.updatePasswordHash(20, 'new-hash-value');

        expect(credential.updatePasswordHash).toHaveBeenCalledWith('new-hash-value');
        expect(credentialAccountContract.persist).toHaveBeenCalledWith(credential);
      });
    });
  });

  // ─── upsertSocialProfile ─────────────────────────────────────────────────

  describe('Given upsertSocialProfile is called', () => {
    const baseProps = {
      userUUID: 'user-uuid-001',
      socialAccountUUID: '019538a0-0000-7000-8000-000000000096',
      provider: 'google',
      providerDisplayName: 'John Doe',
      providerAvatarUrl: 'https://avatar.url',
      givenName: 'John',
      familyName: 'Doe',
      locale: 'en',
      emailVerified: true,
      jobTitle: null,
      rawData: {},
    };

    describe('When the user is not found', () => {
      beforeEach(() => {
        userContract.findByUUID.mockResolvedValue(null);
      });

      it('Then it throws an error mentioning the userUUID', async () => {
        await expect(facade.upsertSocialProfile(baseProps)).rejects.toThrow(
          'user not found uuid=user-uuid-001',
        );
      });
    });

    describe('When the user exists but the profile is not found', () => {
      beforeEach(() => {
        userContract.findByUUID.mockResolvedValue(buildUser(42));
        profileContract.findByUserId.mockResolvedValue(null);
      });

      it('Then it throws an error mentioning the userId', async () => {
        await expect(facade.upsertSocialProfile(baseProps)).rejects.toThrow(
          'profile not found for userId=42',
        );
      });
    });

    describe('When the user and profile both exist', () => {
      beforeEach(() => {
        userContract.findByUUID.mockResolvedValue(buildUser(42));
        profileContract.findByUserId.mockResolvedValue(buildProfileAggregate(5, 42));
        profileContract.upsertSocialProfile.mockResolvedValue(
          {} as ReturnType<typeof profileContract.upsertSocialProfile> extends Promise<infer T>
            ? T
            : never,
        );
      });

      it('Then it upserts the social profile', async () => {
        await facade.upsertSocialProfile(baseProps);
        expect(profileContract.upsertSocialProfile).toHaveBeenCalled();
      });
    });
  });

  // ─── findDisplayNameByUserUUID ───────────────────────────────────────────

  describe('Given findDisplayNameByUserUUID is called', () => {
    describe('When the user is not found', () => {
      beforeEach(() => {
        userContract.findByUUID.mockResolvedValue(null);
      });

      it('Then it returns null', async () => {
        const result = await facade.findDisplayNameByUserUUID('user-uuid-001');
        expect(result).toBeNull();
      });
    });

    describe('When the user has no personal profile', () => {
      beforeEach(() => {
        userContract.findByUUID.mockResolvedValue(buildUser(42));
        profileContract.findPersonalProfileByUserId.mockResolvedValue(null);
      });

      it('Then it returns null', async () => {
        const result = await facade.findDisplayNameByUserUUID('user-uuid-001');
        expect(result).toBeNull();
      });
    });

    describe('When the user has a personal profile with a display name', () => {
      beforeEach(() => {
        userContract.findByUUID.mockResolvedValue(buildUser(42));
        profileContract.findPersonalProfileByUserId.mockResolvedValue(
          buildPersonalProfile(5, 5, { displayName: 'John Doe' }),
        );
      });

      it('Then it returns the display name', async () => {
        const result = await facade.findDisplayNameByUserUUID('user-uuid-001');
        expect(result).toBe('John Doe');
      });
    });
  });

  // ─── findSocialNameByUserUUID ────────────────────────────────────────────

  describe('Given findSocialNameByUserUUID is called', () => {
    describe('When the user is not found', () => {
      beforeEach(() => {
        userContract.findByUUID.mockResolvedValue(null);
      });

      it('Then it returns nulls for all social name fields', async () => {
        const result = await facade.findSocialNameByUserUUID('user-uuid-001');
        expect(result).toEqual({ givenName: null, familyName: null, avatarUrl: null });
      });
    });
  });
});

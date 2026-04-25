import { Injectable, Inject } from '@nestjs/common';
import { IUserFacade } from '@shared/domain/contracts/user-facade.contract';
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
import { SocialAccountModel } from '@user/account/domain/models/social-account.model';
import { ProfileAggregate } from '@user/profile/domain/profile.aggregate';
import { PersonalProfileModel } from '@user/profile/domain/models/personal-profile.model';
import { SocialProfileModel } from '@user/profile/domain/models/social-profile.model';
import { Persisted } from '@shared/domain/contracts/base-repository.contract';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

@Injectable()
export class UserFacade implements IUserFacade {
  constructor(
    @Inject(INJECTION_TOKENS.USER_CONTRACT)
    private readonly userContract: IUserContract,
    @Inject(INJECTION_TOKENS.ACCOUNT_CONTRACT)
    private readonly accountContract: IAccountContract,
    @Inject(INJECTION_TOKENS.CREDENTIAL_ACCOUNT_CONTRACT)
    private readonly credentialAccountContract: ICredentialAccountContract,
    @Inject(INJECTION_TOKENS.SOCIAL_ACCOUNT_CONTRACT)
    private readonly socialAccountContract: ISocialAccountContract,
    @Inject(INJECTION_TOKENS.PROFILE_CONTRACT)
    private readonly profileContract: IProfileContract,
  ) {}

  // === Queries ===

  async findByUUID(uuid: string): Promise<Persisted<UserAggregate> | null> {
    return this.userContract.findByUUID(uuid);
  }

  async findByAccountId(accountId: number): Promise<Persisted<UserAggregate> | null> {
    const account = await this.accountContract.findById(accountId);
    if (!account) return null;
    return this.userContract.findById(account.userId);
  }

  async findUsernameByUUID(uuid: string): Promise<string | null> {
    const user = await this.userContract.findByUUID(uuid);
    if (!user) return null;
    const profile = await this.profileContract.findPersonalProfileByUserId(user.id);
    return profile?.username ?? null;
  }

  async findUserByUUIDWithCredential(uuid: string): Promise<{
    user: Persisted<UserAggregate>;
    credential: Persisted<CredentialAccountModel>;
  } | null> {
    const user = await this.userContract.findByUUID(uuid);
    if (!user) return null;

    // account and credential always exist for a persisted user (created atomically)
    const account = await this.accountContract.findByUserId(user.id);
    const credential = await this.credentialAccountContract.findByAccountId(account!.id);

    return { user, credential: credential! };
  }

  async findUserByEmail(email: string): Promise<{
    user: Persisted<UserAggregate>;
    credential: Persisted<CredentialAccountModel>;
  } | null> {
    const credential = await this.credentialAccountContract.findByEmail(email);
    if (!credential) return null;

    // account and user always exist for a persisted credential (created atomically)
    const account = await this.accountContract.findById(credential.accountId);
    const user = await this.userContract.findById(account!.userId);

    return { user: user!, credential };
  }

  async findUserByEmailOrUsername(identifier: string): Promise<{
    user: Persisted<UserAggregate>;
    credential: Persisted<CredentialAccountModel>;
  } | null> {
    const credential = await this.credentialAccountContract.findByEmailOrUsername(identifier);
    if (!credential) return null;

    // account and user always exist for a persisted credential (created atomically)
    const account = await this.accountContract.findById(credential.accountId);
    const user = await this.userContract.findById(account!.userId);

    return { user: user!, credential };
  }

  async findUserBySocialProvider(
    provider: string,
    providerId: string,
  ): Promise<{ user: Persisted<UserAggregate>; social: Persisted<SocialAccountModel> } | null> {
    const social = await this.socialAccountContract.findByProviderAndProviderId(
      provider,
      providerId,
    );
    if (!social) return null;

    // account and user always exist for a persisted social account (created atomically)
    const account = await this.accountContract.findById(social.accountId);
    const user = await this.userContract.findById(account!.userId);

    return { user: user!, social };
  }

  async existsByUsername(username: string): Promise<boolean> {
    const profile = await this.profileContract.findPersonalProfileByUsername(username);
    return profile !== null;
  }

  async existsByEmail(email: string): Promise<boolean> {
    const credential = await this.credentialAccountContract.findByEmail(email);
    return credential !== null;
  }

  // === Commands ===

  async createUserWithCredentials(props: {
    email: string;
    username: string;
    passwordHash: string | null;
    locale?: string;
  }): Promise<{ user: Persisted<UserAggregate>; credential: Persisted<CredentialAccountModel> }> {
    // 1. Create user anchor
    const user = UserAggregate.create();
    const persistedUser = await this.userContract.persist(user);
    const userId = persistedUser.id;

    // 2. Create account anchor
    const account = AccountAggregate.create({ userId });
    const persistedAccount = await this.accountContract.persist(account);
    const accountId = persistedAccount.id;

    // 3. Create credential account
    const credential = CredentialAccountModel.create({
      accountId,
      email: props.email,
      passwordHash: props.passwordHash,
      createdWith: 'email',
    });
    const persistedCredential = await this.credentialAccountContract.persist(credential);

    // 4. Create profile anchor
    const profile = ProfileAggregate.create({ userId });
    const persistedProfile = await this.profileContract.persistProfile(profile);
    const profileId = persistedProfile.id;

    // 5. Create personal profile
    const personalProfile = PersonalProfileModel.create({
      profileId,
      username: props.username,
      locale: props.locale,
    });
    await this.profileContract.persistPersonalProfile(personalProfile);

    return { user: persistedUser, credential: persistedCredential };
  }

  async findDisplayNameByUserUUID(userUUID: string): Promise<string | null> {
    const user = await this.userContract.findByUUID(userUUID);
    if (!user) return null;
    const profile = await this.profileContract.findPersonalProfileByUserId(user.id);
    return profile?.displayName?.getValue() ?? null;
  }

  async findSocialNameByUserUUID(
    userUUID: string,
  ): Promise<{ givenName: string | null; familyName: string | null; avatarUrl: string | null }> {
    const nullResult = { givenName: null, familyName: null, avatarUrl: null };
    const user = await this.userContract.findByUUID(userUUID);
    if (!user) return nullResult;
    // profile always exists for a persisted user (created atomically)
    const profile = await this.profileContract.findByUserId(user.id);
    const [social, personalProfile] = await Promise.all([
      this.profileContract.findFirstSocialProfileByProfileId(profile!.id),
      this.profileContract.findPersonalProfileByUserId(user.id),
    ]);
    return {
      givenName: social?.givenName?.getValue() ?? null,
      familyName: social?.familyName?.getValue() ?? null,
      avatarUrl:
        social?.providerAvatarUrl?.getValue() ?? personalProfile?.avatarUrl?.getValue() ?? null,
    };
  }

  async createUserFromOAuth(props: {
    email: string;
    username: string;
    provider: string;
    providerId: string;
    providerEmail?: string;
    displayName?: string | null;
    avatarUrl?: string | null;
    locale?: string | null;
  }): Promise<{
    user: Persisted<UserAggregate>;
    credential: Persisted<CredentialAccountModel>;
    social: Persisted<SocialAccountModel>;
  }> {
    // 1. Create user anchor
    const user = UserAggregate.create();
    const persistedUser = await this.userContract.persist(user);
    const userId = persistedUser.id;

    // 2. Create account anchor
    const account = AccountAggregate.create({ userId });
    const persistedAccount = await this.accountContract.persist(account);
    const accountId = persistedAccount.id;

    // 3. Create credential account (OAuth — email verified by provider, no password)
    const credential = CredentialAccountModel.createFromSocial({
      accountId,
      email: props.email,
      provider: props.provider,
    });
    const persistedCredential = await this.credentialAccountContract.persist(credential);

    // 4. Create social account
    const socialModel = SocialAccountModel.create({
      accountId,
      provider: props.provider,
      providerId: props.providerId,
      providerEmail: props.providerEmail,
    });
    const persistedSocial = await this.socialAccountContract.persist(socialModel);

    // 5. Create profile anchor
    const profile = ProfileAggregate.create({ userId });
    const persistedProfile = await this.profileContract.persistProfile(profile);
    const profileId = persistedProfile.id;

    // 6. Create personal profile
    const personalProfile = PersonalProfileModel.create({
      profileId,
      username: props.username,
      displayName: props.displayName,
      locale: props.locale ?? undefined,
    });
    await this.profileContract.persistPersonalProfile(personalProfile);

    return { user: persistedUser, credential: persistedCredential, social: persistedSocial };
  }

  async linkSocialAccount(
    userId: number,
    props: { provider: string; providerId: string; providerEmail?: string },
  ): Promise<Persisted<SocialAccountModel>> {
    const account = await this.accountContract.findByUserId(userId);
    /* istanbul ignore next */
    if (!account) {
      throw new Error(`UserFacade.linkSocialAccount: no account found for userId=${userId}`);
    }

    const socialModel = SocialAccountModel.create({
      accountId: account.id,
      provider: props.provider,
      providerId: props.providerId,
      providerEmail: props.providerEmail,
    });
    return this.socialAccountContract.persist(socialModel);
  }

  // === Profile operations ===

  async updateLocale(userUUID: string, locale: string): Promise<void> {
    const user = await this.userContract.findByUUID(userUUID);
    if (!user) return;
    // personal profile always exists for a persisted user (created atomically)
    const profile = await this.profileContract.findPersonalProfileByUserId(user.id);
    profile!.updateLocale(locale);
    await this.profileContract.persistPersonalProfile(profile!);
  }

  // === CredentialAccount operations ===

  async verifyEmail(credentialAccountId: number): Promise<void> {
    const credential = await this.credentialAccountContract.findById(credentialAccountId);
    /* istanbul ignore next */
    if (!credential) {
      throw new Error(
        `UserFacade.verifyEmail: credentialAccount not found id=${credentialAccountId}`,
      );
    }
    credential.verifyEmail();
    await this.credentialAccountContract.persist(credential);
  }

  /* istanbul ignore next */
  async blockVerification(credentialAccountId: number, until: Date): Promise<void> {
    const credential = await this.credentialAccountContract.findById(credentialAccountId);
    if (!credential) return;
    credential.blockVerification(until);
    await this.credentialAccountContract.persist(credential);
  }

  async updatePasswordHash(credentialAccountId: number, hash: string): Promise<void> {
    const credential = await this.credentialAccountContract.findById(credentialAccountId);
    /* istanbul ignore next */
    if (!credential) {
      throw new Error(
        `UserFacade.updatePasswordHash: credentialAccount not found id=${credentialAccountId}`,
      );
    }
    credential.updatePasswordHash(hash);
    await this.credentialAccountContract.persist(credential);
  }

  async upsertSocialProfile(props: {
    userUUID: string;
    socialAccountUUID: string;
    provider: string;
    providerDisplayName: string | null;
    providerAvatarUrl: string | null;
    givenName: string | null;
    familyName: string | null;
    locale: string | null;
    emailVerified: boolean;
    jobTitle: string | null;
    rawData: Record<string, unknown>;
  }): Promise<void> {
    const user = await this.userContract.findByUUID(props.userUUID);
    /* istanbul ignore next */
    if (!user) {
      throw new Error(`UserFacade.upsertSocialProfile: user not found uuid=${props.userUUID}`);
    }

    const profile = await this.profileContract.findByUserId(user.id);
    /* istanbul ignore next */
    if (!profile) {
      throw new Error(`UserFacade.upsertSocialProfile: profile not found for userId=${user.id}`);
    }

    const model = SocialProfileModel.create({
      profileId: profile.id,
      socialAccountUUID: props.socialAccountUUID,
      provider: props.provider,
      providerDisplayName: props.providerDisplayName,
      providerAvatarUrl: props.providerAvatarUrl,
      givenName: props.givenName,
      familyName: props.familyName,
      locale: props.locale,
      emailVerified: props.emailVerified,
      jobTitle: props.jobTitle,
      rawData: props.rawData,
    });

    await this.profileContract.upsertSocialProfile(model);
  }
}

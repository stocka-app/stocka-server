import { Injectable, Inject } from '@nestjs/common';
import { IUserFacade } from '@shared/domain/contracts/user-facade.contract';
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
import { ProfileAggregate } from '@user/profile/domain/profile.aggregate';
import { PersonalProfileModel } from '@user/profile/domain/models/personal-profile.model';
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

  async findByUUID(uuid: string): Promise<UserAggregate | null> {
    return this.userContract.findByUUID(uuid);
  }

  async findByAccountId(accountId: number): Promise<UserAggregate | null> {
    const account = await this.accountContract.findById(accountId);
    if (!account) return null;
    return this.userContract.findById(account.userId);
  }

  async findUsernameByUUID(uuid: string): Promise<string | null> {
    const user = await this.userContract.findByUUID(uuid);
    if (!user || user.id === undefined) return null;
    const profile = await this.profileContract.findPersonalProfileByUserId(user.id);
    return profile?.username ?? null;
  }

  async findUserByUUIDWithCredential(
    uuid: string,
  ): Promise<{ user: UserAggregate; credential: CredentialAccountModel } | null> {
    const user = await this.userContract.findByUUID(uuid);
    if (!user || user.id === undefined) return null;

    const account = await this.accountContract.findByUserId(user.id);
    if (!account || account.id === undefined) return null;

    const credential = await this.credentialAccountContract.findByAccountId(account.id);
    if (!credential) return null;

    return { user, credential };
  }

  async findUserByEmail(
    email: string,
  ): Promise<{ user: UserAggregate; credential: CredentialAccountModel } | null> {
    const credential = await this.credentialAccountContract.findByEmail(email);
    if (!credential) return null;

    const account = await this.accountContract.findById(credential.accountId);
    if (!account) return null;

    const user = await this.userContract.findById(account.userId);
    if (!user) return null;

    return { user, credential };
  }

  async findUserByEmailOrUsername(
    identifier: string,
  ): Promise<{ user: UserAggregate; credential: CredentialAccountModel } | null> {
    const credential = await this.credentialAccountContract.findByEmailOrUsername(identifier);
    if (!credential) return null;

    const account = await this.accountContract.findById(credential.accountId);
    if (!account) return null;

    const user = await this.userContract.findById(account.userId);
    if (!user) return null;

    return { user, credential };
  }

  async findUserBySocialProvider(
    provider: string,
    providerId: string,
  ): Promise<{ user: UserAggregate; social: SocialAccountModel } | null> {
    const social = await this.socialAccountContract.findByProviderAndProviderId(
      provider,
      providerId,
    );
    if (!social) return null;

    const account = await this.accountContract.findById(social.accountId);
    if (!account) return null;

    const user = await this.userContract.findById(account.userId);
    if (!user) return null;

    return { user, social };
  }

  async existsByUsername(username: string): Promise<boolean> {
    const profile = await this.profileContract.findPersonalProfileByUsername(username);
    return profile !== null;
  }

  async existsByEmail(email: string): Promise<boolean> {
    const credential = await this.credentialAccountContract.findByEmail(email);
    return credential !== null;
  }

  // === Helpers ===

  private requireId(id: number | undefined, label: string): number {
    if (id === undefined) throw new Error(`${label}: persist returned no id`);
    return id;
  }

  // === Commands ===

  async createUserWithCredentials(props: {
    email: string;
    username: string;
    passwordHash: string | null;
    locale?: string;
  }): Promise<{ user: UserAggregate; credential: CredentialAccountModel }> {
    // 1. Create user anchor
    const user = UserAggregate.create();
    const persistedUser = await this.userContract.persist(user);
    const userId = this.requireId(persistedUser.id, 'createUserWithCredentials:user');

    // 2. Create account anchor
    const account = AccountAggregate.create({ userId });
    const persistedAccount = await this.accountContract.persist(account);
    const accountId = this.requireId(persistedAccount.id, 'createUserWithCredentials:account');

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
    const profileId = this.requireId(persistedProfile.id, 'createUserWithCredentials:profile');

    // 5. Create personal profile
    const personalProfile = PersonalProfileModel.create({
      profileId,
      username: props.username,
      locale: props.locale,
    });
    await this.profileContract.persistPersonalProfile(personalProfile);

    return { user: persistedUser, credential: persistedCredential };
  }

  async createUserFromOAuth(props: {
    email: string;
    username: string;
    provider: string;
    providerId: string;
    providerEmail?: string;
  }): Promise<{
    user: UserAggregate;
    credential: CredentialAccountModel;
    social: SocialAccountModel;
  }> {
    // 1. Create user anchor
    const user = UserAggregate.create();
    const persistedUser = await this.userContract.persist(user);
    const userId = this.requireId(persistedUser.id, 'createUserFromOAuth:user');

    // 2. Create account anchor
    const account = AccountAggregate.create({ userId });
    const persistedAccount = await this.accountContract.persist(account);
    const accountId = this.requireId(persistedAccount.id, 'createUserFromOAuth:account');

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
    const profileId = this.requireId(persistedProfile.id, 'createUserFromOAuth:profile');

    // 6. Create personal profile
    const personalProfile = PersonalProfileModel.create({
      profileId,
      username: props.username,
    });
    await this.profileContract.persistPersonalProfile(personalProfile);

    return { user: persistedUser, credential: persistedCredential, social: persistedSocial };
  }

  async linkSocialAccount(
    userId: number,
    props: { provider: string; providerId: string; providerEmail?: string },
  ): Promise<SocialAccountModel> {
    const account = await this.accountContract.findByUserId(userId);
    if (!account) {
      throw new Error(`UserFacade.linkSocialAccount: no account found for userId=${userId}`);
    }

    const socialModel = SocialAccountModel.create({
      accountId: this.requireId(account.id, 'linkSocialAccount:account'),
      provider: props.provider,
      providerId: props.providerId,
      providerEmail: props.providerEmail,
    });
    return this.socialAccountContract.persist(socialModel);
  }

  // === CredentialAccount operations ===

  async verifyEmail(credentialAccountId: number): Promise<void> {
    const credential = await this.credentialAccountContract.findById(credentialAccountId);
    if (!credential) {
      throw new Error(
        `UserFacade.verifyEmail: credentialAccount not found id=${credentialAccountId}`,
      );
    }
    credential.verifyEmail();
    await this.credentialAccountContract.persist(credential);
  }

  async blockVerification(credentialAccountId: number, until: Date): Promise<void> {
    const credential = await this.credentialAccountContract.findById(credentialAccountId);
    if (!credential) return;
    credential.blockVerification(until);
    await this.credentialAccountContract.persist(credential);
  }

  async updatePasswordHash(credentialAccountId: number, hash: string): Promise<void> {
    const credential = await this.credentialAccountContract.findById(credentialAccountId);
    if (!credential) {
      throw new Error(
        `UserFacade.updatePasswordHash: credentialAccount not found id=${credentialAccountId}`,
      );
    }
    credential.updatePasswordHash(hash);
    await this.credentialAccountContract.persist(credential);
  }
}

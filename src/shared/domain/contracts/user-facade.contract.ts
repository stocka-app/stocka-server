import { UserAggregate } from '@user/domain/models/user.aggregate';
import { CredentialAccountModel } from '@user/account/domain/models/credential-account.model';
import { SocialAccountModel } from '@user/account/domain/models/social-account.model';
import { Persisted } from '@shared/domain/contracts/base-repository.contract';

/**
 * IUserFacade — typed contract for cross-BC communication with User BC.
 *
 * Replaces the untyped `IUserFacade` that lived inside mediator.service.ts.
 * Now in shared/domain so both Auth BC and MediatorService can reference it
 * without importing User BC internals.
 *
 * When called within an active UoW transaction, cross-BC writes automatically
 * join the transaction via the shared AsyncLocalStorage-backed UoW singleton.
 * No transaction context parameter needed — repos detect it internally.
 *
 * Methods that retrieve or persist domain objects return Persisted<T> so callers
 * can safely access .id without type assertions.
 */
export interface IUserFacade {
  // === Queries ===
  findByUUID(uuid: string): Promise<Persisted<UserAggregate> | null>;
  findByAccountId(accountId: number): Promise<Persisted<UserAggregate> | null>;
  findUsernameByUUID(uuid: string): Promise<string | null>;
  findUserByUUIDWithCredential(uuid: string): Promise<{
    user: Persisted<UserAggregate>;
    credential: Persisted<CredentialAccountModel>;
  } | null>;
  findUserByEmail(email: string): Promise<{
    user: Persisted<UserAggregate>;
    credential: Persisted<CredentialAccountModel>;
  } | null>;
  findUserByEmailOrUsername(identifier: string): Promise<{
    user: Persisted<UserAggregate>;
    credential: Persisted<CredentialAccountModel>;
  } | null>;
  findUserBySocialProvider(
    provider: string,
    providerId: string,
  ): Promise<{ user: Persisted<UserAggregate>; social: Persisted<SocialAccountModel> } | null>;
  existsByUsername(username: string): Promise<boolean>;
  existsByEmail(email: string): Promise<boolean>;
  findDisplayNameByUserUUID(userUUID: string): Promise<string | null>;
  findSocialNameByUserUUID(
    userUUID: string,
  ): Promise<{ givenName: string | null; familyName: string | null; avatarUrl: string | null }>;

  // === Commands ===
  createUserWithCredentials(props: {
    email: string;
    username: string;
    passwordHash: string | null;
    locale?: string;
  }): Promise<{ user: Persisted<UserAggregate>; credential: Persisted<CredentialAccountModel> }>;

  createUserFromOAuth(props: {
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
  }>;

  linkSocialAccount(
    userId: number,
    props: {
      provider: string;
      providerId: string;
      providerEmail?: string;
    },
  ): Promise<Persisted<SocialAccountModel>>;

  upsertSocialProfile(props: {
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
  }): Promise<void>;

  // === Profile operations ===
  updateLocale(userUUID: string, locale: string): Promise<void>;

  // === CredentialAccount operations ===
  verifyEmail(credentialAccountId: number): Promise<void>;
  blockVerification(credentialAccountId: number, until: Date): Promise<void>;
  updatePasswordHash(credentialAccountId: number, hash: string): Promise<void>;
}

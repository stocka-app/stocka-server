import { UserAggregate } from '@user/domain/models/user.aggregate';
import { CredentialAccountModel } from '@user/account/domain/models/credential-account.model';
import { SocialAccountModel } from '@user/account/domain/models/social-account.model';

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
 */
export interface IUserFacade {
  // === Queries ===
  findByUUID(uuid: string): Promise<UserAggregate | null>;
  findByAccountId(accountId: number): Promise<UserAggregate | null>;
  findUsernameByUUID(uuid: string): Promise<string | null>;
  findUserByUUIDWithCredential(uuid: string): Promise<{ user: UserAggregate; credential: CredentialAccountModel } | null>;
  findUserByEmail(email: string): Promise<{ user: UserAggregate; credential: CredentialAccountModel } | null>;
  findUserByEmailOrUsername(identifier: string): Promise<{ user: UserAggregate; credential: CredentialAccountModel } | null>;
  findUserBySocialProvider(provider: string, providerId: string): Promise<{ user: UserAggregate; social: SocialAccountModel } | null>;
  existsByUsername(username: string): Promise<boolean>;
  existsByEmail(email: string): Promise<boolean>;

  // === Commands ===
  createUserWithCredentials(props: {
    email: string;
    username: string;
    passwordHash: string | null;
    locale?: string;
  }): Promise<{ user: UserAggregate; credential: CredentialAccountModel }>;

  createUserFromOAuth(props: {
    email: string;
    username: string;
    provider: string;
    providerId: string;
    providerEmail?: string;
  }): Promise<{ user: UserAggregate; credential: CredentialAccountModel; social: SocialAccountModel }>;

  linkSocialAccount(userId: number, props: {
    provider: string;
    providerId: string;
    providerEmail?: string;
  }): Promise<SocialAccountModel>;

  // === CredentialAccount operations ===
  verifyEmail(credentialAccountId: number): Promise<void>;
  blockVerification(credentialAccountId: number, until: Date): Promise<void>;
  updatePasswordHash(credentialAccountId: number, hash: string): Promise<void>;
}

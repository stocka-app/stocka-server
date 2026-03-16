import { AccountAggregate } from '@user/account/domain/account.aggregate';
import { CredentialAccountModel } from '@user/account/domain/models/credential-account.model';
import { SocialAccountModel } from '@user/account/domain/models/social-account.model';

export interface IAccountContract {
  findById(id: number): Promise<AccountAggregate | null>;
  findByUserId(userId: number): Promise<AccountAggregate | null>;
  persist(account: AccountAggregate): Promise<AccountAggregate>;
}

export interface ICredentialAccountContract {
  findById(id: number): Promise<CredentialAccountModel | null>;
  findByAccountId(accountId: number): Promise<CredentialAccountModel | null>;
  findByEmail(email: string): Promise<CredentialAccountModel | null>;
  findByEmailOrUsername(identifier: string): Promise<CredentialAccountModel | null>;
  persist(model: CredentialAccountModel): Promise<CredentialAccountModel>;
  archiveByAccountId(accountId: number): Promise<void>;
}

export interface ISocialAccountContract {
  findByAccountId(accountId: number): Promise<SocialAccountModel[]>;
  findByProviderAndProviderId(provider: string, providerId: string): Promise<SocialAccountModel | null>;
  persist(model: SocialAccountModel): Promise<SocialAccountModel>;
}

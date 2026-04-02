import { AccountAggregate } from '@user/account/domain/account.aggregate';
import { CredentialAccountModel } from '@user/account/domain/models/credential-account.model';
import { SocialAccountModel } from '@user/account/domain/models/social-account.model';
import { Persisted } from '@shared/domain/contracts/base-repository.contract';

export interface IAccountContract {
  findById(id: number): Promise<Persisted<AccountAggregate> | null>;
  findByUserId(userId: number): Promise<Persisted<AccountAggregate> | null>;
  persist(account: AccountAggregate): Promise<Persisted<AccountAggregate>>;
}

export interface ICredentialAccountContract {
  findById(id: number): Promise<Persisted<CredentialAccountModel> | null>;
  findByAccountId(accountId: number): Promise<Persisted<CredentialAccountModel> | null>;
  findByEmail(email: string): Promise<Persisted<CredentialAccountModel> | null>;
  findByEmailOrUsername(identifier: string): Promise<Persisted<CredentialAccountModel> | null>;
  persist(model: CredentialAccountModel): Promise<Persisted<CredentialAccountModel>>;
  archiveByAccountId(accountId: number): Promise<void>;
}

export interface ISocialAccountContract {
  findByAccountId(accountId: number): Promise<Persisted<SocialAccountModel>[]>;
  findByProviderAndProviderId(
    provider: string,
    providerId: string,
  ): Promise<Persisted<SocialAccountModel> | null>;
  persist(model: SocialAccountModel): Promise<Persisted<SocialAccountModel>>;
}

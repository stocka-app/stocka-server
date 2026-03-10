import { SocialAccountModel } from '@user/domain/models/social-account.model';

export interface ISocialAccountContract {
  persist(data: {
    userId: number;
    provider: string;
    providerId: string;
  }): Promise<SocialAccountModel>;

  findByProviderAndProviderId(
    provider: string,
    providerId: string,
  ): Promise<SocialAccountModel | null>;
}

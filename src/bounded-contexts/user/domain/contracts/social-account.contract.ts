import { SocialAccountEntity } from '@user/infrastructure/persistence/entities/social-account.entity';

export interface ISocialAccountContract {
  persist(data: {
    userId: number;
    provider: string;
    providerId: string;
  }): Promise<SocialAccountEntity>;
}

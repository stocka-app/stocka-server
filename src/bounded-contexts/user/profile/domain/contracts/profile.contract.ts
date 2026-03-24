import { ProfileAggregate } from '@user/profile/domain/profile.aggregate';
import { PersonalProfileModel } from '@user/profile/domain/models/personal-profile.model';
import { CommercialProfileModel } from '@user/profile/domain/models/commercial-profile.model';
import { SocialProfileModel } from '@user/profile/domain/models/social-profile.model';

export interface IProfileContract {
  findByUserId(userId: number): Promise<ProfileAggregate | null>;
  findPersonalProfileByUserId(userId: number): Promise<PersonalProfileModel | null>;
  findPersonalProfileByUsername(username: string): Promise<PersonalProfileModel | null>;
  persistProfile(profile: ProfileAggregate): Promise<ProfileAggregate>;
  persistPersonalProfile(model: PersonalProfileModel): Promise<PersonalProfileModel>;
  persistCommercialProfile(model: CommercialProfileModel): Promise<CommercialProfileModel>;
  upsertSocialProfile(model: SocialProfileModel): Promise<SocialProfileModel>;
  findSocialProfileByProfileAndProvider(
    profileId: number,
    provider: string,
  ): Promise<SocialProfileModel | null>;
}

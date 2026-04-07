import { ProfileAggregate } from '@user/profile/domain/profile.aggregate';
import { PersonalProfileModel } from '@user/profile/domain/models/personal-profile.model';
import { SocialProfileModel } from '@user/profile/domain/models/social-profile.model';
import { Persisted } from '@shared/domain/contracts/base-repository.contract';

export interface IProfileContract {
  findByUserId(userId: number): Promise<Persisted<ProfileAggregate> | null>;
  findPersonalProfileByUserId(userId: number): Promise<Persisted<PersonalProfileModel> | null>;
  findPersonalProfileByUsername(username: string): Promise<Persisted<PersonalProfileModel> | null>;
  persistProfile(profile: ProfileAggregate): Promise<Persisted<ProfileAggregate>>;
  persistPersonalProfile(model: PersonalProfileModel): Promise<Persisted<PersonalProfileModel>>;
  upsertSocialProfile(model: SocialProfileModel): Promise<Persisted<SocialProfileModel>>;
  findSocialProfileByProfileAndProvider(
    profileId: number,
    provider: string,
  ): Promise<Persisted<SocialProfileModel> | null>;
  findFirstSocialProfileByProfileId(
    profileId: number,
  ): Promise<Persisted<SocialProfileModel> | null>;
}

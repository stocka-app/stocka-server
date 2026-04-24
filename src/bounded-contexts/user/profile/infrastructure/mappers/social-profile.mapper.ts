import { SocialProfileModel } from '@user/profile/domain/models/social-profile.model';
import { SocialProfileEntity } from '@user/profile/infrastructure/entities/social-profile.entity';

export class SocialProfileMapper {
  static toDomain(entity: SocialProfileEntity): SocialProfileModel {
    return SocialProfileModel.reconstitute({
      id: entity.id,
      uuid: entity.uuid,
      profileId: entity.profileId,
      socialAccountUUID: entity.socialAccountUUID,
      provider: entity.provider,
      providerDisplayName: entity.providerDisplayName,
      providerAvatarUrl: entity.providerAvatarUrl,
      providerProfileUrl: entity.providerProfileUrl,
      givenName: entity.givenName,
      familyName: entity.familyName,
      locale: entity.locale,
      emailVerified: entity.emailVerified ?? false,
      jobTitle: entity.jobTitle,
      rawData: entity.rawData ?? {},
      syncedAt: entity.syncedAt,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      archivedAt: entity.archivedAt,
    });
  }

  static toEntity(model: SocialProfileModel): Partial<SocialProfileEntity> {
    const entity: Partial<SocialProfileEntity> = {
      uuid: model.uuid,
      profileId: model.profileId,
      socialAccountUUID: model.socialAccountUUID.toString(),
      provider: model.provider,
      providerDisplayName:
        model.providerDisplayName !== null ? model.providerDisplayName.getValue() : null,
      providerAvatarUrl:
        model.providerAvatarUrl !== null ? model.providerAvatarUrl.getValue() : null,
      providerProfileUrl:
        model.providerProfileUrl !== null ? model.providerProfileUrl.getValue() : null,
      givenName: model.givenName !== null ? model.givenName.getValue() : null,
      familyName: model.familyName !== null ? model.familyName.getValue() : null,
      locale: model.locale,
      emailVerified: model.emailVerified,
      jobTitle: model.jobTitle !== null ? model.jobTitle.getValue() : null,
      rawData: model.rawData,
      syncedAt: model.syncedAt,
      archivedAt: model.archivedAt,
    };

    /* istanbul ignore next */
    if (model.id !== undefined) {
      entity.id = model.id;
    }

    return entity;
  }
}

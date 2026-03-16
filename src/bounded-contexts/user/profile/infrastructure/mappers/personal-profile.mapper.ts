import { PersonalProfileModel } from '@user/profile/domain/models/personal-profile.model';
import { PersonalProfileEntity } from '@user/profile/infrastructure/entities/personal-profile.entity';

export class PersonalProfileMapper {
  static toDomain(entity: PersonalProfileEntity): PersonalProfileModel {
    return PersonalProfileModel.reconstitute({
      id: entity.id,
      uuid: entity.uuid,
      profileId: entity.profileId,
      username: entity.username,
      displayName: entity.displayName,
      avatarUrl: entity.avatarUrl,
      locale: entity.locale,
      timezone: entity.timezone,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      archivedAt: entity.archivedAt,
    });
  }

  static toEntity(model: PersonalProfileModel): Partial<PersonalProfileEntity> {
    const entity: Partial<PersonalProfileEntity> = {
      uuid: model.uuid,
      profileId: model.profileId,
      username: model.username,
      displayName: model.displayName,
      avatarUrl: model.avatarUrl,
      locale: model.locale,
      timezone: model.timezone,
      archivedAt: model.archivedAt,
    };

    if (model.id !== undefined) {
      entity.id = model.id;
    }

    return entity;
  }
}

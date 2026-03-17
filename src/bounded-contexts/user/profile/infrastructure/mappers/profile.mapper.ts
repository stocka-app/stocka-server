import { ProfileAggregate } from '@user/profile/domain/profile.aggregate';
import { ProfileEntity } from '@user/profile/infrastructure/entities/profile.entity';

export class ProfileMapper {
  static toDomain(entity: ProfileEntity): ProfileAggregate {
    return ProfileAggregate.reconstitute({
      id: entity.id,
      uuid: entity.uuid,
      userId: entity.userId,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      archivedAt: entity.archivedAt,
    });
  }

  static toEntity(model: ProfileAggregate): Partial<ProfileEntity> {
    const entity: Partial<ProfileEntity> = {
      uuid: model.uuid,
      userId: model.userId,
      archivedAt: model.archivedAt,
    };

    /* istanbul ignore next */
    if (model.id !== undefined) {
      entity.id = model.id;
    }

    return entity;
  }
}

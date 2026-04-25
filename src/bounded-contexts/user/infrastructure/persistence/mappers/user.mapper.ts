import { UserAggregate } from '@user/domain/aggregates/user.aggregate';
import { UserEntity } from '@user/infrastructure/persistence/entities/user.entity';

export class UserMapper {
  static toDomain(entity: UserEntity): UserAggregate {
    return UserAggregate.reconstitute({
      id: entity.id,
      uuid: entity.uuid,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      archivedAt: entity.archivedAt,
    });
  }

  static toEntity(model: UserAggregate): Partial<UserEntity> {
    const entity: Partial<UserEntity> = {
      uuid: model.uuid,
      archivedAt: model.archivedAt,
    };

    if (model.id !== undefined) {
      entity.id = model.id;
    }

    return entity;
  }
}

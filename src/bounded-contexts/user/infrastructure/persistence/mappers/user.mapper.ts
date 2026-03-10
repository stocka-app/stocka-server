import { UserAggregate } from '@user/domain/models/user.aggregate';
import { UserEntity } from '@user/infrastructure/persistence/entities/user.entity';

export class UserMapper {
  static toDomain(entity: UserEntity): UserAggregate {
    return UserAggregate.reconstitute({
      id: entity.id,
      uuid: entity.uuid,
      email: entity.email,
      username: entity.username,
      passwordHash: entity.passwordHash,
      status: entity.status,
      emailVerifiedAt: entity.emailVerifiedAt,
      verificationBlockedUntil: entity.verificationBlockedUntil,
      createdWith: entity.createdWith,
      accountType: entity.accountType,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      archivedAt: entity.archivedAt,
    });
  }

  static toEntity(model: UserAggregate): Partial<UserEntity> {
    const entity: Partial<UserEntity> = {
      uuid: model.uuid,
      email: model.email,
      username: model.username,
      passwordHash: model.passwordHash,
      status: model.status.toString(),
      emailVerifiedAt: model.emailVerifiedAt,
      verificationBlockedUntil: model.verificationBlockedUntil,
      createdWith: model.createdWith,
      accountType: model.accountType,
      archivedAt: model.archivedAt,
    };

    // Only include id if it exists (for updates)
    if (model.id !== undefined) {
      entity.id = model.id;
    }

    return entity;
  }
}

import { PasswordResetTokenAggregate } from '@authentication/domain/aggregates/password-reset-token.aggregate';
import { PasswordResetTokenEntity } from '@authentication/infrastructure/persistence/entities/password-reset-token.entity';

export class PasswordResetTokenMapper {
  static toDomain(entity: PasswordResetTokenEntity): PasswordResetTokenAggregate {
    return PasswordResetTokenAggregate.reconstitute({
      id: entity.id,
      uuid: entity.uuid,
      credentialAccountId: entity.credentialAccountId,
      tokenHash: entity.tokenHash,
      expiresAt: entity.expiresAt,
      usedAt: entity.usedAt,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      archivedAt: entity.archivedAt,
    });
  }

  static toEntity(model: PasswordResetTokenAggregate): Partial<PasswordResetTokenEntity> {
    const entity: Partial<PasswordResetTokenEntity> = {
      uuid: model.uuid,
      credentialAccountId: model.credentialAccountId,
      tokenHash: model.tokenHash,
      expiresAt: model.expiresAt,
      usedAt: model.usedAt,
      archivedAt: model.archivedAt,
    };

    if (model.id !== undefined) {
      entity.id = model.id;
    }

    return entity;
  }
}

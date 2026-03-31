import { SocialSessionModel } from '@user/account/session/domain/models/social-session.model';
import { SocialSessionEntity } from '@user/account/session/infrastructure/entities/social-session.entity';

export class SocialSessionMapper {
  static toDomain(entity: SocialSessionEntity): SocialSessionModel {
    return SocialSessionModel.reconstitute({
      id: entity.id,
      uuid: entity.uuid,
      sessionId: entity.sessionId,
      socialAccountId: entity.socialAccountId,
      provider: entity.provider,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      archivedAt: entity.archivedAt,
    });
  }

  static toEntity(model: SocialSessionModel, sessionId: number): Partial<SocialSessionEntity> {
    const entity: Partial<SocialSessionEntity> = {
      sessionId,
      socialAccountId: model.socialAccountId,
      provider: model.provider,
    };

    if (model.id !== undefined) {
      entity.id = model.id;
    }

    return entity;
  }
}

import { SessionModel } from '@authentication/domain/models/session.model';
import { SessionEntity } from '@user/account/session/infrastructure/entities/session.entity';

export class SessionMapper {
  static toDomain(entity: SessionEntity): SessionModel {
    return SessionModel.reconstitute({
      id: entity.id,
      uuid: entity.uuid,
      accountId: entity.accountId,
      tokenHash: entity.tokenHash,
      expiresAt: entity.expiresAt,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      archivedAt: entity.archivedAt,
    });
  }

  static toEntity(model: SessionModel): Partial<SessionEntity> {
    const entity: Partial<SessionEntity> = {
      uuid: model.uuid,
      accountId: model.accountId,
      tokenHash: model.tokenHash,
      expiresAt: model.expiresAt,
      archivedAt: model.archivedAt,
    };

    if (model.id !== undefined) {
      entity.id = model.id;
    }

    return entity;
  }
}

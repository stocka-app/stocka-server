import { CredentialSessionModel } from '@user/account/session/domain/models/credential-session.model';
import { CredentialSessionEntity } from '@user/account/session/infrastructure/entities/credential-session.entity';

export class CredentialSessionMapper {
  static toDomain(entity: CredentialSessionEntity): CredentialSessionModel {
    return CredentialSessionModel.reconstitute({
      id: entity.id,
      uuid: entity.uuid,
      sessionId: entity.sessionId,
      credentialAccountId: entity.credentialAccountId,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      archivedAt: entity.archivedAt,
    });
  }

  static toEntity(
    model: CredentialSessionModel,
    sessionId: number,
  ): Partial<CredentialSessionEntity> {
    const entity: Partial<CredentialSessionEntity> = {
      sessionId,
      credentialAccountId: model.credentialAccountId,
    };

    if (model.id !== undefined) {
      entity.id = model.id;
    }

    return entity;
  }
}

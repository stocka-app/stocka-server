import { EmailVerificationTokenModel } from '@auth/domain/models/email-verification-token.model';
import { EmailVerificationTokenEntity } from '@auth/infrastructure/persistence/entities/email-verification-token.entity';

export class EmailVerificationTokenMapper {
  static toDomain(entity: EmailVerificationTokenEntity): EmailVerificationTokenModel {
    return EmailVerificationTokenModel.reconstitute({
      id: entity.id,
      uuid: entity.uuid,
      userId: entity.userId,
      codeHash: entity.codeHash,
      expiresAt: entity.expiresAt,
      usedAt: entity.usedAt,
      resendCount: entity.resendCount,
      lastResentAt: entity.lastResentAt,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      archivedAt: entity.archivedAt,
    });
  }

  static toEntity(model: EmailVerificationTokenModel): Partial<EmailVerificationTokenEntity> {
    const entity: Partial<EmailVerificationTokenEntity> = {
      uuid: model.uuid,
      userId: model.userId,
      codeHash: model.codeHash,
      expiresAt: model.expiresAt,
      usedAt: model.usedAt,
      resendCount: model.resendCount,
      lastResentAt: model.lastResentAt,
      archivedAt: model.archivedAt,
    };

    if (model.id !== undefined) {
      entity.id = model.id;
    }

    return entity;
  }
}

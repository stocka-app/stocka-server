import { EmailVerificationTokenAggregate } from '@authentication/domain/aggregates/email-verification-token.aggregate';
import { EmailVerificationTokenEntity } from '@authentication/infrastructure/persistence/entities/email-verification-token.entity';

export class EmailVerificationTokenMapper {
  static toDomain(entity: EmailVerificationTokenEntity): EmailVerificationTokenAggregate {
    return EmailVerificationTokenAggregate.reconstitute({
      id: entity.id,
      uuid: entity.uuid,
      credentialAccountId: entity.credentialAccountId,
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

  static toEntity(model: EmailVerificationTokenAggregate): Partial<EmailVerificationTokenEntity> {
    const entity: Partial<EmailVerificationTokenEntity> = {
      uuid: model.uuid,
      credentialAccountId: model.credentialAccountId,
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

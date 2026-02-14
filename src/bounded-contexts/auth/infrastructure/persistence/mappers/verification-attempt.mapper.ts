import { VerificationAttemptModel } from '@auth/domain/models/verification-attempt.model';
import { VerificationAttemptEntity } from '@auth/infrastructure/persistence/entities/verification-attempt.entity';

export class VerificationAttemptMapper {
  static toDomain(entity: VerificationAttemptEntity): VerificationAttemptModel {
    return VerificationAttemptModel.reconstitute({
      id: entity.id,
      uuid: entity.uuid,
      userUuid: entity.userUuid,
      email: entity.email,
      ipAddress: entity.ipAddress,
      userAgent: entity.userAgent,
      codeEntered: entity.codeEntered,
      success: entity.success,
      verificationType: entity.verificationType,
      attemptedAt: entity.attemptedAt,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      archivedAt: entity.archivedAt,
    });
  }

  static toEntity(model: VerificationAttemptModel): Partial<VerificationAttemptEntity> {
    const entity: Partial<VerificationAttemptEntity> = {
      uuid: model.uuid,
      userUuid: model.userUuid,
      email: model.email,
      ipAddress: model.ipAddress,
      userAgent: model.userAgent,
      codeEntered: model.codeEntered,
      success: model.success,
      verificationType: model.verificationType,
      attemptedAt: model.attemptedAt,
      archivedAt: model.archivedAt,
    };

    if (model.id !== undefined) {
      entity.id = model.id;
    }

    return entity;
  }
}

import { VerificationAttemptAggregate } from '@authentication/domain/aggregates/verification-attempt.aggregate';
import { VerificationAttemptEntity } from '@authentication/infrastructure/persistence/entities/verification-attempt.entity';

export class VerificationAttemptMapper {
  static toDomain(entity: VerificationAttemptEntity): VerificationAttemptAggregate {
    return VerificationAttemptAggregate.reconstitute({
      id: entity.id,
      uuid: entity.uuid,
      userUUID: entity.userUUID,
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

  static toEntity(model: VerificationAttemptAggregate): Partial<VerificationAttemptEntity> {
    const entity: Partial<VerificationAttemptEntity> = {
      uuid: model.uuid,
      userUUID: model.userUUID?.toString() ?? null,
      email: model.email?.toString() ?? null,
      ipAddress: model.ipAddress.toString(),
      userAgent: model.userAgent?.getValue() ?? null,
      codeEntered: model.codeEntered?.toString() ?? null,
      success: model.result.isSuccessful(),
      verificationType: model.verificationType.toString(),
      attemptedAt: model.attemptedAt.toDate(),
      archivedAt: model.archivedAt,
    };

    if (model.id !== undefined) {
      entity.id = model.id;
    }

    return entity;
  }
}

import { OnboardingSessionEntity } from '@onboarding/infrastructure/entities/onboarding-session.entity';
import { OnboardingSessionModel } from '@onboarding/domain/models/onboarding-session.model';
import { OnboardingPath } from '@onboarding/domain/enums/onboarding-path.enum';
import { OnboardingStatus } from '@onboarding/domain/enums/onboarding-status.enum';

export class OnboardingSessionMapper {
  static toDomain(entity: OnboardingSessionEntity): OnboardingSessionModel {
    const path =
      entity.path === 'CREATE'
        ? OnboardingPath.CREATE
        : entity.path === 'JOIN'
          ? OnboardingPath.JOIN
          : null;

    const status =
      entity.status === 'COMPLETED' ? OnboardingStatus.COMPLETED : OnboardingStatus.IN_PROGRESS;

    return OnboardingSessionModel.reconstitute({
      id: entity.id,
      userUUID: entity.userUUID,
      path,
      currentStep: entity.currentStep,
      stepData: entity.stepData,
      invitationCode: entity.invitationCode,
      status,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  static toEntity(model: OnboardingSessionModel): Partial<OnboardingSessionEntity> {
    return {
      ...(model.id ? { id: model.id } : {}),
      userUUID: model.userUUID.toString(),
      path: model.path,
      currentStep: model.currentStep,
      stepData: model.stepData,
      invitationCode: model.invitationCode,
      status: model.status,
    };
  }
}

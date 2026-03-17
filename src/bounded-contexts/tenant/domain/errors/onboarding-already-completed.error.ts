import { BusinessLogicException } from '@shared/domain/exceptions/business-logic.exception';

export class OnboardingAlreadyCompletedError extends BusinessLogicException {
  constructor() {
    super('Onboarding has already been completed for this user', 'ONBOARDING_ALREADY_COMPLETED');
  }
}

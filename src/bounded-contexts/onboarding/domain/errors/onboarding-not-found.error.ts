import { BusinessLogicException } from '@shared/domain/exceptions/business-logic.exception';

export class OnboardingNotFoundError extends BusinessLogicException {
  constructor() {
    super('Onboarding session not found. Call POST /api/onboarding/start first.', 'ONBOARDING_NOT_FOUND');
  }
}

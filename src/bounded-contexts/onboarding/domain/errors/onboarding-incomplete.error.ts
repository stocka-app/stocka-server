import { BusinessLogicException } from '@shared/domain/exceptions/business-logic.exception';

export class OnboardingIncompleteError extends BusinessLogicException {
  constructor(missingStep: string) {
    super(
      `Cannot complete onboarding: missing required step data (${missingStep})`,
      'ONBOARDING_INCOMPLETE',
    );
  }
}

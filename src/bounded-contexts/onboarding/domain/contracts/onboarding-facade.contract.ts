import { OnboardingStatus } from '@onboarding/domain/enums/onboarding-status.enum';

export interface IOnboardingFacade {
  getOnboardingStatus(userUUID: string): Promise<OnboardingStatus | null>;
}

import { OnboardingSessionModel } from '@onboarding/domain/models/onboarding-session.model';

export interface IOnboardingSessionContract {
  findByUserUUID(userUUID: string): Promise<OnboardingSessionModel | null>;
  save(session: OnboardingSessionModel): Promise<OnboardingSessionModel>;
}

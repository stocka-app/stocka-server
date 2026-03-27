import { UserAggregate } from '@user/domain/models/user.aggregate';
import { OnboardingStatus } from '@onboarding/domain/enums/onboarding-status.enum';

export interface RefreshSessionSagaContext {
  // Input — the old refresh token from the httpOnly cookie
  readonly refreshToken: string;

  // Computed by steps during execution
  oldSessionUUID?: string;
  user?: UserAggregate;
  email?: string;
  accountId?: number;
  accessToken?: string;
  newRefreshToken?: string;
  newSessionUUID?: string;

  // Enrichment data (fetched in generate-tokens step)
  username?: string;
  givenName?: string | null;
  familyName?: string | null;
  avatarUrl?: string | null;
  onboardingStatus?: OnboardingStatus | null;
}

export interface RefreshSessionSagaOutput {
  readonly accessToken: string;
  readonly refreshToken: string; // the new refresh token
  readonly username: string | null;
  readonly givenName: string | null;
  readonly familyName: string | null;
  readonly avatarUrl: string | null;
  readonly onboardingStatus: OnboardingStatus | null;
}

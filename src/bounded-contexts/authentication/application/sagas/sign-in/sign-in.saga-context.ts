import { UserAggregate } from '@user/domain/models/user.aggregate';
import { CredentialAccountModel } from '@user/account/domain/models/credential-account.model';
import { SessionAggregate } from '@user/account/session/domain/session.aggregate';
import { OnboardingStatus } from '@onboarding/domain/enums/onboarding-status.enum';

export interface SignInSagaContext {
  // Input
  readonly emailOrUsername: string;
  readonly password: string;

  // Computed by steps
  user?: UserAggregate;
  credential?: CredentialAccountModel;
  accountId?: number;
  username?: string;
  accessToken?: string;
  refreshToken?: string;
  session?: SessionAggregate; // stored for EventPublisher.commit() in publish-events step

  // Enrichment data (fetched in generate-tokens step)
  givenName?: string | null;
  familyName?: string | null;
  avatarUrl?: string | null;
  onboardingStatus?: OnboardingStatus | null;
}

export interface SignInSagaOutput {
  readonly user: UserAggregate;
  readonly credential: CredentialAccountModel;
  readonly username: string;
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly emailVerificationRequired: false;
  readonly givenName: string | null;
  readonly familyName: string | null;
  readonly avatarUrl: string | null;
  readonly onboardingStatus: OnboardingStatus | null;
}

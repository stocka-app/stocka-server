import { UserAggregate } from '@user/domain/aggregates/user.aggregate';
import { CredentialAccountModel } from '@user/account/domain/models/credential-account.model';
import { SessionAggregate } from '@user/account/session/domain/session.aggregate';

export type SocialSignInPath = 'existing-provider' | 'linked-provider' | 'new-user';

export interface SocialSignInSagaContext {
  // Input — set before saga.execute()
  readonly email: string;
  readonly displayName: string;
  readonly provider: string;
  readonly providerId: string;
  readonly givenName: string | null;
  readonly familyName: string | null;
  readonly avatarUrl: string | null;
  readonly locale: string | null;
  readonly emailVerified: boolean;
  readonly jobTitle: string | null;
  readonly rawData: Record<string, unknown>;

  // Computed by steps during execution
  user?: UserAggregate;
  credential?: CredentialAccountModel;
  accountId?: number;
  socialAccountId?: number;
  socialAccountUUID?: string;
  path?: SocialSignInPath;
  accessToken?: string;
  refreshToken?: string;
  session?: SessionAggregate; // stored for EventPublisher.commit() in publish-events step
}

export interface SocialSignInSagaOutput {
  readonly user: UserAggregate;
  readonly credential: CredentialAccountModel;
  readonly accessToken: string;
  readonly refreshToken: string;
}

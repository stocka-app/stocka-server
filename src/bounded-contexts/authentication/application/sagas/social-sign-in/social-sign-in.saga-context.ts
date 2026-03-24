import { UserAggregate } from '@user/domain/models/user.aggregate';
import { CredentialAccountModel } from '@user/account/domain/models/credential-account.model';

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
  socialAccountUUID?: string;
  path?: SocialSignInPath;
  accessToken?: string;
  refreshToken?: string;
}

export interface SocialSignInSagaOutput {
  readonly user: UserAggregate;
  readonly credential: CredentialAccountModel;
  readonly accessToken: string;
  readonly refreshToken: string;
}

import { UserAggregate } from '@user/domain/models/user.aggregate';
import { CredentialAccountModel } from '@user/account/domain/models/credential-account.model';
import { SessionModel } from '@authentication/domain/models/session.model';

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
  session?: SessionModel; // stored for EventPublisher.commit() in publish-events step
}

export interface SignInSagaOutput {
  readonly user: UserAggregate;
  readonly credential: CredentialAccountModel;
  readonly username: string;
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly emailVerificationRequired: false;
}

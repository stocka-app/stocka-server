import { IPersistedUserView } from '@shared/domain/contracts/user-view.contract';
import { SessionModel } from '@authentication/domain/models/session.model';

export interface SignInSagaContext {
  // Input
  readonly emailOrUsername: string;
  readonly password: string;

  // Computed by steps
  user?: IPersistedUserView;
  accessToken?: string;
  refreshToken?: string;
  session?: SessionModel; // stored for EventPublisher.commit() in publish-events step
}

export interface SignInSagaOutput {
  readonly user: IPersistedUserView;
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly emailVerificationRequired: false;
}

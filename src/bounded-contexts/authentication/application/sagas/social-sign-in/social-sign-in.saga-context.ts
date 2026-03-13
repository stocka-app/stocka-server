import { IPersistedUserView } from '@shared/domain/contracts/user-view.contract';

export type SocialSignInPath = 'existing-provider' | 'linked-provider' | 'new-user';

export interface SocialSignInSagaContext {
  // Input — set before saga.execute()
  readonly email: string;
  readonly displayName: string;
  readonly provider: string;
  readonly providerId: string;

  // Computed by steps during execution
  user?: IPersistedUserView;
  path?: SocialSignInPath;
  accessToken?: string;
  refreshToken?: string;
}

export interface SocialSignInSagaOutput {
  readonly user: IPersistedUserView;
  readonly accessToken: string;
  readonly refreshToken: string;
}

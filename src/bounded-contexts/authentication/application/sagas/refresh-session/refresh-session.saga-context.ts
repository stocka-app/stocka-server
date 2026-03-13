import { IPersistedUserView } from '@shared/domain/contracts/user-view.contract';

export interface RefreshSessionSagaContext {
  // Input — the old refresh token from the httpOnly cookie
  readonly refreshToken: string;

  // Computed by steps during execution
  oldSessionUUID?: string;
  user?: IPersistedUserView;
  accessToken?: string;
  newRefreshToken?: string;
  newSessionUUID?: string;
}

export interface RefreshSessionSagaOutput {
  readonly accessToken: string;
  readonly refreshToken: string; // the new refresh token
}

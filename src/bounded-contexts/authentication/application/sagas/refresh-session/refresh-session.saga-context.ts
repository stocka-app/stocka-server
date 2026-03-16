import { UserAggregate } from '@user/domain/models/user.aggregate';

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
}

export interface RefreshSessionSagaOutput {
  readonly accessToken: string;
  readonly refreshToken: string; // the new refresh token
}

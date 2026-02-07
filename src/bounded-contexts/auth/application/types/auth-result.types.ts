import { UserModel } from '@/user/domain/models/user.model';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResult extends AuthTokens {
  user: UserModel;
}

export type RefreshSessionResult = AuthTokens;

export type SocialSignInResult = AuthResult;

export interface ResetPasswordResult {
  message: string;
}

export interface ForgotPasswordResult {
  message: string;
}

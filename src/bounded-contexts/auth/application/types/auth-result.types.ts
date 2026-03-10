import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result } from '@shared/domain/result';
import { IUserView } from '@shared/domain/contracts/user-view.contract';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResult extends AuthTokens {
  user: IUserView;
}

export interface SignInResult extends AuthResult {
  emailVerificationRequired: boolean;
}

export interface SignUpResult extends AuthResult {
  emailVerificationRequired: boolean;
}

export interface VerifyEmailResult {
  success: boolean;
  message: string;
}

export interface ResendVerificationCodeResult {
  success: boolean;
  message: string;
  cooldownSeconds?: number;
  remainingResends?: number;
}

export type RefreshSessionResult = AuthTokens;
export type SocialSignInResult = AuthResult;

export interface ResetPasswordResult {
  message: string;
}

export interface ForgotPasswordResult {
  message: string;
}

// Result types (neverthrow)
export type SignInCommandResult = Result<SignInResult, DomainException>;
export type SignUpCommandResult = Result<SignUpResult, DomainException>;
export type VerifyEmailCommandResult = Result<VerifyEmailResult, DomainException>;
export type ResendVerificationCodeCommandResult = Result<
  ResendVerificationCodeResult,
  DomainException
>;
export type ResetPasswordCommandResult = Result<ResetPasswordResult, DomainException>;
export type RefreshSessionCommandResult = Result<RefreshSessionResult, DomainException>;

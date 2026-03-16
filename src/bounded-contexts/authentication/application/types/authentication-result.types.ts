import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result } from '@shared/domain/result';
import { UserAggregate } from '@user/domain/models/user.aggregate';
import { CredentialAccountModel } from '@user/account/domain/models/credential-account.model';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthenticationResult extends AuthTokens {
  user: UserAggregate;
  credential: CredentialAccountModel;
}

export interface SignInResult extends AuthenticationResult {
  username: string;
  emailVerificationRequired: boolean;
}

export interface SignUpResult extends AuthenticationResult {
  username: string;
  emailVerificationRequired: boolean;
  emailSent: boolean;
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
export type SocialSignInResult = AuthenticationResult;

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

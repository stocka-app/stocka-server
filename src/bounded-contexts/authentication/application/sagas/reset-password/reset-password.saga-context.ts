import { PasswordResetTokenAggregate } from '@authentication/domain/aggregates/password-reset-token.aggregate';

export interface ResetPasswordSagaContext {
  // Input
  readonly token: string;
  readonly newPassword: string;

  // Computed by steps
  resetToken?: PasswordResetTokenAggregate;
  newPasswordHash?: string;
}

export interface ResetPasswordSagaOutput {
  readonly message: string;
}

import { PasswordResetTokenModel } from '@authentication/domain/models/password-reset-token.model';

export interface ResetPasswordSagaContext {
  // Input
  readonly token: string;
  readonly newPassword: string;

  // Computed by steps
  resetToken?: PasswordResetTokenModel;
  newPasswordHash?: string;
}

export interface ResetPasswordSagaOutput {
  readonly message: string;
}

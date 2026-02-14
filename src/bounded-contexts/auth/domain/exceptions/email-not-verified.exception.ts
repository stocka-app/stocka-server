import { BusinessLogicException } from '@shared/domain/exceptions/business-logic.exception';

export class EmailNotVerifiedException extends BusinessLogicException {
  constructor() {
    super(
      'Email verification required. Please verify your email before signing in.',
      'EMAIL_NOT_VERIFIED',
      [{ field: 'email', message: 'Email not verified' }],
    );
  }
}

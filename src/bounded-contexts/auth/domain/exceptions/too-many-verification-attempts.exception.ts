import { BusinessLogicException } from '@/shared/domain/exceptions/business-logic.exception';

export class TooManyVerificationAttemptsException extends BusinessLogicException {
  constructor(remainingAttempts?: number) {
    const message =
      remainingAttempts !== undefined
        ? `Too many verification attempts. ${remainingAttempts} attempts remaining.`
        : 'Too many verification attempts';
    super(message, 'TOO_MANY_VERIFICATION_ATTEMPTS', [
      { field: 'code', message: 'You have exceeded the maximum number of verification attempts' },
    ]);
  }
}

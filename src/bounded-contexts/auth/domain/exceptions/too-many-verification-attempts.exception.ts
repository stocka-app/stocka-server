import { BusinessLogicException } from '@shared/domain/exceptions/business-logic.exception';

export class TooManyVerificationAttemptsException extends BusinessLogicException {
  constructor(attemptsRemaining: number) {
    const message = `Incorrect code. ${attemptsRemaining} attempt${attemptsRemaining === 1 ? '' : 's'} remaining`;
    super(message, 'TOO_MANY_VERIFICATION_ATTEMPTS', [{ field: 'code', message }], {
      attemptsRemaining,
    });
  }
}

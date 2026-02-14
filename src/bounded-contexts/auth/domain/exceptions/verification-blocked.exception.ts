import { BusinessLogicException } from '@/shared/domain/exceptions/business-logic.exception';

export class VerificationBlockedException extends BusinessLogicException {
  constructor(blockedUntil: Date) {
    const minutesRemaining = Math.ceil((blockedUntil.getTime() - Date.now()) / 60000);
    const message = `Too many attempts. Try again in ${minutesRemaining} minute${minutesRemaining === 1 ? '' : 's'}`;
    super(message, 'VERIFICATION_BLOCKED', [{ field: 'verification', message }], {
      minutesRemaining,
      blockedUntil: blockedUntil.toISOString(),
    });
  }
}

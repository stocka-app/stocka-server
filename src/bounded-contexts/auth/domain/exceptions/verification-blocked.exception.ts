import { BusinessLogicException } from '@/shared/domain/exceptions/business-logic.exception';

export class VerificationBlockedException extends BusinessLogicException {
  constructor(blockedUntil: Date) {
    const minutesRemaining = Math.ceil((blockedUntil.getTime() - Date.now()) / 60000);
    super(
      `Verification is temporarily blocked. Please try again in ${minutesRemaining} minutes.`,
      'VERIFICATION_BLOCKED',
      [
        {
          field: 'verification',
          message: `Account verification is temporarily blocked until ${blockedUntil.toISOString()}`,
        },
      ],
    );
  }
}

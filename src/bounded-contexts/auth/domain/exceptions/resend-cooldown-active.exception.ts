import { BusinessLogicException } from '@/shared/domain/exceptions/business-logic.exception';

export class ResendCooldownActiveException extends BusinessLogicException {
  constructor(secondsRemaining: number) {
    super(
      `Please wait ${secondsRemaining} seconds before requesting a new code`,
      'RESEND_COOLDOWN_ACTIVE',
      [
        {
          field: 'resend',
          message: `Cooldown active. Wait ${secondsRemaining} seconds.`,
        },
      ],
    );
  }
}

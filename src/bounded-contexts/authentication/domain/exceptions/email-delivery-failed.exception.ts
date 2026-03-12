import { BusinessLogicException } from '@shared/domain/exceptions/business-logic.exception';

export class EmailDeliveryFailedException extends BusinessLogicException {
  constructor(reason?: string) {
    super(
      reason || 'Failed to send verification email. Please try again later.',
      'EMAIL_DELIVERY_FAILED',
      [{ field: 'email', message: 'Email delivery failed' }],
    );
  }
}

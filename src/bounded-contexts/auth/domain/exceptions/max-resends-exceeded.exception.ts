import { BusinessLogicException } from '@shared/domain/exceptions/business-logic.exception';

export class MaxResendsExceededException extends BusinessLogicException {
  constructor() {
    super(
      'Maximum number of code resend attempts exceeded. Please try again later.',
      'MAX_RESENDS_EXCEEDED',
      [
        {
          field: 'resend',
          message: 'You have exceeded the maximum number of resend attempts for this hour',
        },
      ],
    );
  }
}

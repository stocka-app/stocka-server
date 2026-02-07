import { BusinessLogicException } from '@/shared/domain/exceptions/business-logic.exception';

export class InvalidVerificationCodeException extends BusinessLogicException {
  constructor() {
    super('Invalid verification code', 'INVALID_VERIFICATION_CODE', [
      { field: 'code', message: 'The verification code is invalid' },
    ]);
  }
}

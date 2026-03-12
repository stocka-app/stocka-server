import { BusinessLogicException } from '@shared/domain/exceptions/business-logic.exception';

export class VerificationCodeExpiredException extends BusinessLogicException {
  constructor() {
    super('Verification code has expired', 'VERIFICATION_CODE_EXPIRED', [
      { field: 'code', message: 'The verification code has expired. Please request a new one.' },
    ]);
  }
}

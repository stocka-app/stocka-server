import { BusinessLogicException } from '@/shared/domain/exceptions/business-logic.exception';

export class UserAlreadyVerifiedException extends BusinessLogicException {
  constructor() {
    super('User email is already verified', 'USER_ALREADY_VERIFIED', [
      { field: 'email', message: 'This email address has already been verified' },
    ]);
  }
}

import { BusinessLogicException } from '@shared/domain/exceptions/business-logic.exception';

export class EmailAlreadyExistsException extends BusinessLogicException {
  constructor() {
    super('This email is already registered', 'EMAIL_ALREADY_EXISTS', [
      { field: 'email', message: 'This email is already registered' },
    ]);
  }
}

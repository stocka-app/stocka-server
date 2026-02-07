import { BusinessLogicException } from '@/shared/domain/exceptions/business-logic.exception';

export class EmailAlreadyExistsException extends BusinessLogicException {
  constructor() {
    super('Email already registered', 'EMAIL_ALREADY_EXISTS', [
      { field: 'email', message: 'Email already registered' },
    ]);
  }
}

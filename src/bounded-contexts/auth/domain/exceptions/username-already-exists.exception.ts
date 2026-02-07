import { BusinessLogicException } from '@/shared/domain/exceptions/business-logic.exception';

export class UsernameAlreadyExistsException extends BusinessLogicException {
  constructor() {
    super('Username already taken', 'USERNAME_ALREADY_EXISTS', [
      { field: 'username', message: 'Username already taken' },
    ]);
  }
}

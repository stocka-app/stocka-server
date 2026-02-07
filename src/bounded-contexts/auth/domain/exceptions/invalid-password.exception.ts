import { BusinessLogicException } from '@/shared/domain/exceptions/business-logic.exception';

export class InvalidPasswordException extends BusinessLogicException {
  constructor(message: string = 'Invalid password') {
    super(message, 'INVALID_PASSWORD', [{ field: 'password', message }]);
  }
}

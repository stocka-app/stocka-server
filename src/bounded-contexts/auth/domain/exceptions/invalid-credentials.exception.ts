import { BusinessLogicException } from '@/shared/domain/exceptions/business-logic.exception';

export class InvalidCredentialsException extends BusinessLogicException {
  constructor() {
    super('Invalid credentials', 'INVALID_CREDENTIALS', []);
  }
}

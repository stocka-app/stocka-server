import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class InvalidUsernameException extends DomainException {
  constructor(message: string) {
    super(message, 'INVALID_USERNAME', [{ field: 'username', message }]);
  }
}

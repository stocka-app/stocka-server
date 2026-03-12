import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class InvalidUserAgentException extends DomainException {
  constructor(message: string) {
    super(message, 'INVALID_USER_AGENT', [{ field: 'userAgent', message }]);
  }
}

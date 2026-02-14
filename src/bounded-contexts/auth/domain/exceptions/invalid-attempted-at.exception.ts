import { DomainException } from '@/shared/domain/exceptions/domain.exception';

export class InvalidAttemptedAtException extends DomainException {
  constructor(message: string) {
    super(message, 'INVALID_ATTEMPTED_AT', [{ field: 'attemptedAt', message }]);
  }
}

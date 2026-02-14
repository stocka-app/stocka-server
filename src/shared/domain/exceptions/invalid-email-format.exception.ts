import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class InvalidEmailFormatException extends DomainException {
  constructor(email: string) {
    super(`Invalid email format: ${email}`, 'INVALID_EMAIL', [
      { field: 'email', message: 'Invalid email format' },
    ]);
  }
}

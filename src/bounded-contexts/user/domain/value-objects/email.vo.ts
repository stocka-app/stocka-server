import { StringVO } from '@/shared/domain/value-objects/primitive/string.vo';
import { DomainException } from '@/shared/domain/exceptions/domain.exception';

class InvalidEmailFormatException extends DomainException {
  constructor(email: string) {
    super(`Invalid email format: ${email}`, 'INVALID_EMAIL', [
      { field: 'email', message: 'Invalid email format' },
    ]);
  }
}

export class EmailVO extends StringVO {
  constructor(value: string) {
    super(value.trim().toLowerCase());
    this.ensureValid();
  }

  protected ensureValid(): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.value)) {
      throw new InvalidEmailFormatException(this.value);
    }
  }
}

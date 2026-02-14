import { StringVO } from '@shared/domain/value-objects/primitive/string.vo';
import { DomainException } from '@shared/domain/exceptions/domain.exception';

class InvalidUsernameException extends DomainException {
  constructor(message: string) {
    super(message, 'INVALID_USERNAME', [{ field: 'username', message }]);
  }
}

export class UsernameVO extends StringVO {
  private static readonly MIN_LENGTH = 3;
  private static readonly MAX_LENGTH = 30;
  private static readonly PATTERN = /^[a-zA-Z0-9_]+$/;

  constructor(value: string) {
    super(value.trim());
    this.ensureValid();
  }

  protected ensureValid(): void {
    if (this.value.length < UsernameVO.MIN_LENGTH) {
      throw new InvalidUsernameException(
        `Username must be at least ${UsernameVO.MIN_LENGTH} characters long`,
      );
    }

    if (this.value.length > UsernameVO.MAX_LENGTH) {
      throw new InvalidUsernameException(
        `Username must not exceed ${UsernameVO.MAX_LENGTH} characters`,
      );
    }

    if (!UsernameVO.PATTERN.test(this.value)) {
      throw new InvalidUsernameException(
        'Username can only contain letters, numbers, and underscores',
      );
    }
  }
}

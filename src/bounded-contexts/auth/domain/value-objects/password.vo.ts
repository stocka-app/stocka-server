import { StringVO } from '@/shared/domain/value-objects/primitive/string.vo';
import { BusinessLogicException } from '@/shared/domain/exceptions/business-logic.exception';

class InvalidPasswordException extends BusinessLogicException {
  constructor(message: string) {
    super(message, 'INVALID_PASSWORD', [{ field: 'password', message }]);
  }
}

export class PasswordVO extends StringVO {
  private static readonly MIN_LENGTH = 8;
  private static readonly UPPERCASE_PATTERN = /[A-Z]/;
  private static readonly NUMBER_PATTERN = /[0-9]/;

  constructor(value: string) {
    super(value);
    this.ensureValid();
  }

  protected ensureValid(): void {
    if (this.value.length < PasswordVO.MIN_LENGTH) {
      throw new InvalidPasswordException(
        `Password must be at least ${PasswordVO.MIN_LENGTH} characters long`,
      );
    }

    if (!PasswordVO.UPPERCASE_PATTERN.test(this.value)) {
      throw new InvalidPasswordException('Password must contain at least one uppercase letter');
    }

    if (!PasswordVO.NUMBER_PATTERN.test(this.value)) {
      throw new InvalidPasswordException('Password must contain at least one number');
    }
  }
}

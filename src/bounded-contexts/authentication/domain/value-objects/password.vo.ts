import { StringVO } from '@shared/domain/value-objects/primitive/string.vo';
import { InvalidPasswordException } from '@authentication/domain/exceptions/invalid-password.exception';
import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_UPPERCASE_PATTERN,
  PASSWORD_DIGIT_PATTERN,
  PASSWORD_SPECIAL_CHAR_PATTERN,
} from '@common/constants/validation.constants';

export class PasswordVO extends StringVO {
  constructor(value: string) {
    super(value);
    this.ensureValid();
  }

  protected ensureValid(): void {
    if (this.value.length < PASSWORD_MIN_LENGTH) {
      throw new InvalidPasswordException(
        `Password must be at least ${PASSWORD_MIN_LENGTH} characters long`,
      );
    }

    if (!PASSWORD_UPPERCASE_PATTERN.test(this.value)) {
      throw new InvalidPasswordException('Password must contain at least one uppercase letter');
    }

    if (!PASSWORD_DIGIT_PATTERN.test(this.value)) {
      throw new InvalidPasswordException('Password must contain at least one number');
    }

    if (!PASSWORD_SPECIAL_CHAR_PATTERN.test(this.value)) {
      throw new InvalidPasswordException('Password must contain at least one special character');
    }
  }
}

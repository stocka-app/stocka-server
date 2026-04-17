import { StringVO } from '@shared/domain/value-objects/primitive/string.vo';
import { InvalidUsernameException } from '@user/domain/exceptions/invalid-username.exception';
import {
  USERNAME_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_PATTERN,
} from '@common/constants/validation.constants';

export class UsernameVO extends StringVO {
  constructor(value: string) {
    super(value.trim());
    this.ensureValid();
  }

  protected ensureValid(): void {
    if (this.value.length < USERNAME_MIN_LENGTH) {
      throw new InvalidUsernameException(
        `Username must be at least ${USERNAME_MIN_LENGTH} characters long`,
      );
    }

    if (this.value.length > USERNAME_MAX_LENGTH) {
      throw new InvalidUsernameException(
        `Username must not exceed ${USERNAME_MAX_LENGTH} characters`,
      );
    }

    if (!USERNAME_PATTERN.test(this.value)) {
      throw new InvalidUsernameException(
        'Username can only contain letters, numbers, and underscores',
      );
    }
  }
}

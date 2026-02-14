import { StringVO } from '@/shared/domain/value-objects/primitive/string.vo';
import { DomainException } from '@/shared/domain/exceptions/domain.exception';

class InvalidUserAgentException extends DomainException {
  constructor(message: string) {
    super(message, 'INVALID_USER_AGENT', [{ field: 'userAgent', message }]);
  }
}

export class UserAgentVO extends StringVO {
  private static readonly MAX_LENGTH = 512;

  constructor(value: string) {
    super(value.trim());
    this.ensureValid();
  }

  protected ensureValid(): void {
    if (this.value.length === 0) {
      throw new InvalidUserAgentException('User agent cannot be empty');
    }

    if (this.value.length > UserAgentVO.MAX_LENGTH) {
      throw new InvalidUserAgentException(
        `User agent must not exceed ${UserAgentVO.MAX_LENGTH} characters`,
      );
    }
  }
}

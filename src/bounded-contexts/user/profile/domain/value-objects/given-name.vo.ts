import { StringVO } from '@shared/domain/value-objects/primitive/string.vo';

export class GivenNameVO extends StringVO {
  private static readonly MAX_LENGTH = 100;

  constructor(value: string) {
    super(value);
    this.ensureValid();
  }

  static create(value: string): GivenNameVO {
    return new GivenNameVO(value.trim());
  }

  protected ensureValid(): void {
    if (this.value.length === 0) {
      throw new Error('GivenName cannot be empty');
    }
    if (this.value.length > GivenNameVO.MAX_LENGTH) {
      throw new Error(`GivenName cannot exceed ${GivenNameVO.MAX_LENGTH} characters`);
    }
  }
}

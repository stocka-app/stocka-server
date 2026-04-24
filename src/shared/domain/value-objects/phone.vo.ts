import { StringVO } from '@shared/domain/value-objects/primitive/string.vo';

export class PhoneVO extends StringVO {
  private static readonly MAX_LENGTH = 30;

  constructor(value: string) {
    super(value);
    this.ensureValid();
  }

  static create(value: string): PhoneVO {
    return new PhoneVO(value.trim());
  }

  protected ensureValid(): void {
    if (this.value.length === 0) {
      throw new Error('Phone cannot be empty');
    }
    if (this.value.length > PhoneVO.MAX_LENGTH) {
      throw new Error(`Phone cannot exceed ${PhoneVO.MAX_LENGTH} characters`);
    }
  }
}

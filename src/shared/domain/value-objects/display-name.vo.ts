import { StringVO } from '@shared/domain/value-objects/primitive/string.vo';

export class DisplayNameVO extends StringVO {
  private static readonly MAX_LENGTH = 100;

  constructor(value: string) {
    super(value);
    this.ensureValid();
  }

  static create(value: string): DisplayNameVO {
    return new DisplayNameVO(value.trim());
  }

  protected ensureValid(): void {
    if (this.value.length === 0) {
      throw new Error('DisplayName cannot be empty');
    }
    if (this.value.length > DisplayNameVO.MAX_LENGTH) {
      throw new Error(`DisplayName cannot exceed ${DisplayNameVO.MAX_LENGTH} characters`);
    }
  }
}

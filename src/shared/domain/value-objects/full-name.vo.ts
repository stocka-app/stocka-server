import { StringVO } from '@shared/domain/value-objects/primitive/string.vo';

export class FullNameVO extends StringVO {
  private static readonly MAX_LENGTH = 100;

  constructor(value: string) {
    super(value);
    this.ensureValid();
  }

  static create(value: string): FullNameVO {
    return new FullNameVO(value.trim());
  }

  protected ensureValid(): void {
    if (this.value.length === 0) {
      throw new Error('FullName cannot be empty');
    }
    if (this.value.length > FullNameVO.MAX_LENGTH) {
      throw new Error(`FullName cannot exceed ${FullNameVO.MAX_LENGTH} characters`);
    }
  }
}

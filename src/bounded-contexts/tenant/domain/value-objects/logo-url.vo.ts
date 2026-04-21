import { StringVO } from '@shared/domain/value-objects/primitive/string.vo';

export class LogoUrlVO extends StringVO {
  private static readonly MAX_LENGTH = 500;

  constructor(value: string) {
    super(value);
    this.ensureValid();
  }

  static create(value: string): LogoUrlVO {
    return new LogoUrlVO(value.trim());
  }

  protected ensureValid(): void {
    if (this.value.length === 0) {
      throw new Error('Logo URL cannot be empty');
    }
    if (this.value.length > LogoUrlVO.MAX_LENGTH) {
      throw new Error(`Logo URL cannot exceed ${LogoUrlVO.MAX_LENGTH} characters`);
    }
  }
}

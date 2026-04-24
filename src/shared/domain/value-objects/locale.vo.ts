import { StringVO } from '@shared/domain/value-objects/primitive/string.vo';

export class LocaleVO extends StringVO {
  private static readonly MAX_LENGTH = 10;

  constructor(value: string) {
    super(value);
    this.ensureValid();
  }

  static create(value: string): LocaleVO {
    return new LocaleVO(value.trim());
  }

  protected ensureValid(): void {
    if (this.value.length === 0) {
      throw new Error('Locale cannot be empty');
    }
    if (this.value.length > LocaleVO.MAX_LENGTH) {
      throw new Error(`Locale cannot exceed ${LocaleVO.MAX_LENGTH} characters`);
    }
  }
}

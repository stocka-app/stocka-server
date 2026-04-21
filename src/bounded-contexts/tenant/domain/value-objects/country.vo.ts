import { StringVO } from '@shared/domain/value-objects/primitive/string.vo';

export class CountryVO extends StringVO {
  private static readonly MAX_LENGTH = 5;

  constructor(value: string) {
    super(value);
    this.ensureValid();
  }

  static create(value: string): CountryVO {
    return new CountryVO(value.trim());
  }

  protected ensureValid(): void {
    if (this.value.length === 0) {
      throw new Error('Country cannot be empty');
    }
    if (this.value.length > CountryVO.MAX_LENGTH) {
      throw new Error(`Country cannot exceed ${CountryVO.MAX_LENGTH} characters`);
    }
  }
}

import { StringVO } from '@shared/domain/value-objects/primitive/string.vo';

export class CountryCodeVO extends StringVO {
  private static readonly MAX_LENGTH = 5;

  constructor(value: string) {
    super(value);
    this.ensureValid();
  }

  static create(value: string): CountryCodeVO {
    return new CountryCodeVO(value.trim().toUpperCase());
  }

  protected ensureValid(): void {
    if (this.value.length === 0) {
      throw new Error('CountryCode cannot be empty');
    }
    if (this.value.length > CountryCodeVO.MAX_LENGTH) {
      throw new Error(`CountryCode cannot exceed ${CountryCodeVO.MAX_LENGTH} characters`);
    }
  }
}

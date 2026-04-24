import { StringVO } from '@shared/domain/value-objects/primitive/string.vo';

export class TaxIdVO extends StringVO {
  private static readonly MAX_LENGTH = 50;

  constructor(value: string) {
    super(value);
    this.ensureValid();
  }

  static create(value: string): TaxIdVO {
    return new TaxIdVO(value.trim().toUpperCase());
  }

  protected ensureValid(): void {
    if (this.value.length === 0) {
      throw new Error('TaxId cannot be empty');
    }
    if (this.value.length > TaxIdVO.MAX_LENGTH) {
      throw new Error(`TaxId cannot exceed ${TaxIdVO.MAX_LENGTH} characters`);
    }
  }
}

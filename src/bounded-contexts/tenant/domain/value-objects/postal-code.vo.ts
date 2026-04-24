import { StringVO } from '@shared/domain/value-objects/primitive/string.vo';

export class PostalCodeVO extends StringVO {
  private static readonly MAX_LENGTH = 20;

  constructor(value: string) {
    super(value);
    this.ensureValid();
  }

  static create(value: string): PostalCodeVO {
    return new PostalCodeVO(value.trim());
  }

  protected ensureValid(): void {
    if (this.value.length === 0) {
      throw new Error('Postal code cannot be empty');
    }
    if (this.value.length > PostalCodeVO.MAX_LENGTH) {
      throw new Error(`Postal code cannot exceed ${PostalCodeVO.MAX_LENGTH} characters`);
    }
  }
}

import { StringVO } from '@shared/domain/value-objects/primitive/string.vo';

export class AddressLineVO extends StringVO {
  private static readonly MAX_LENGTH = 200;

  constructor(value: string) {
    super(value);
    this.ensureValid();
  }

  static create(value: string): AddressLineVO {
    return new AddressLineVO(value.trim());
  }

  protected ensureValid(): void {
    if (this.value.length === 0) {
      throw new Error('Address line cannot be empty');
    }
    if (this.value.length > AddressLineVO.MAX_LENGTH) {
      throw new Error(`Address line cannot exceed ${AddressLineVO.MAX_LENGTH} characters`);
    }
  }
}

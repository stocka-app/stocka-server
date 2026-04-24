import { StringVO } from '@shared/domain/value-objects/primitive/string.vo';

export class CityVO extends StringVO {
  private static readonly MAX_LENGTH = 100;

  constructor(value: string) {
    super(value);
    this.ensureValid();
  }

  static create(value: string): CityVO {
    return new CityVO(value.trim());
  }

  protected ensureValid(): void {
    if (this.value.length === 0) {
      throw new Error('City cannot be empty');
    }
    if (this.value.length > CityVO.MAX_LENGTH) {
      throw new Error(`City cannot exceed ${CityVO.MAX_LENGTH} characters`);
    }
  }
}

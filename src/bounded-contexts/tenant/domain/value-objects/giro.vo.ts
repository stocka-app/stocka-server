import { StringVO } from '@shared/domain/value-objects/primitive/string.vo';

export class GiroVO extends StringVO {
  private static readonly MAX_LENGTH = 100;

  constructor(value: string) {
    super(value);
    this.ensureValid();
  }

  static create(value: string): GiroVO {
    return new GiroVO(value.trim());
  }

  protected ensureValid(): void {
    if (this.value.length === 0) {
      throw new Error('Giro cannot be empty');
    }
    if (this.value.length > GiroVO.MAX_LENGTH) {
      throw new Error(`Giro cannot exceed ${GiroVO.MAX_LENGTH} characters`);
    }
  }
}

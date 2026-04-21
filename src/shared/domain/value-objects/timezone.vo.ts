import { StringVO } from '@shared/domain/value-objects/primitive/string.vo';

export class TimezoneVO extends StringVO {
  private static readonly MAX_LENGTH = 50;

  constructor(value: string) {
    super(value);
    this.ensureValid();
  }

  static create(value: string): TimezoneVO {
    return new TimezoneVO(value.trim());
  }

  protected ensureValid(): void {
    if (this.value.length === 0) {
      throw new Error('Timezone cannot be empty');
    }
    if (this.value.length > TimezoneVO.MAX_LENGTH) {
      throw new Error(`Timezone cannot exceed ${TimezoneVO.MAX_LENGTH} characters`);
    }
  }
}

import { StringVO } from '@shared/domain/value-objects/primitive/string.vo';

export class StateVO extends StringVO {
  private static readonly MAX_LENGTH = 100;

  constructor(value: string) {
    super(value);
    this.ensureValid();
  }

  static create(value: string): StateVO {
    return new StateVO(value.trim());
  }

  protected ensureValid(): void {
    if (this.value.length === 0) {
      throw new Error('State cannot be empty');
    }
    if (this.value.length > StateVO.MAX_LENGTH) {
      throw new Error(`State cannot exceed ${StateVO.MAX_LENGTH} characters`);
    }
  }
}

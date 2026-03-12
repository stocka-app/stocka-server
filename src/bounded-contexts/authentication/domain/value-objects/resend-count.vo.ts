import { NumberVO } from '@shared/domain/value-objects/primitive/number.vo';

export class ResendCountVO extends NumberVO {
  constructor(value: number) {
    super(value);
    this.ensureValid();
  }

  protected ensureValid(): void {
    if (!Number.isInteger(this.value)) {
      throw new Error('Resend count must be an integer');
    }
    if (this.value < 0) {
      throw new Error('Resend count cannot be negative');
    }
  }

  increment(): ResendCountVO {
    return new ResendCountVO(this.value + 1);
  }
}

import { NumberVO } from '@shared/domain/value-objects/primitive/number.vo';

export class StepNumberVO extends NumberVO {
  constructor(value: number) {
    super(value);
    this.ensureValid();
  }

  static create(value: number): StepNumberVO {
    return new StepNumberVO(value);
  }

  protected ensureValid(): void {
    if (!Number.isInteger(this.value) || this.value < 0) {
      throw new Error('Step number must be a non-negative integer');
    }
  }
}

import { StringVO } from '@shared/domain/value-objects/primitive/string.vo';

export class TokenHashVO extends StringVO {
  constructor(value: string) {
    super(value);
    this.ensureValid();
  }

  protected ensureValid(): void {
    if (!this.value || this.value.trim().length === 0) {
      throw new Error('Token hash cannot be empty');
    }
  }
}

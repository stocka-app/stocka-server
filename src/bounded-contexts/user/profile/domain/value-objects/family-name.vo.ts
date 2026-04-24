import { StringVO } from '@shared/domain/value-objects/primitive/string.vo';

export class FamilyNameVO extends StringVO {
  private static readonly MAX_LENGTH = 100;

  constructor(value: string) {
    super(value);
    this.ensureValid();
  }

  static create(value: string): FamilyNameVO {
    return new FamilyNameVO(value.trim());
  }

  protected ensureValid(): void {
    if (this.value.length === 0) {
      throw new Error('FamilyName cannot be empty');
    }
    if (this.value.length > FamilyNameVO.MAX_LENGTH) {
      throw new Error(`FamilyName cannot exceed ${FamilyNameVO.MAX_LENGTH} characters`);
    }
  }
}

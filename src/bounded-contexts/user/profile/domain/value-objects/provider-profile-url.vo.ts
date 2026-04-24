import { StringVO } from '@shared/domain/value-objects/primitive/string.vo';

export class ProviderProfileUrlVO extends StringVO {
  private static readonly MAX_LENGTH = 500;

  constructor(value: string) {
    super(value);
    this.ensureValid();
  }

  static create(value: string): ProviderProfileUrlVO {
    return new ProviderProfileUrlVO(value.trim());
  }

  protected ensureValid(): void {
    if (this.value.length === 0) {
      throw new Error('ProviderProfileUrl cannot be empty');
    }
    if (this.value.length > ProviderProfileUrlVO.MAX_LENGTH) {
      throw new Error(
        `ProviderProfileUrl cannot exceed ${ProviderProfileUrlVO.MAX_LENGTH} characters`,
      );
    }
  }
}

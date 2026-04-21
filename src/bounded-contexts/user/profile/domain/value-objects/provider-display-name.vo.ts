import { StringVO } from '@shared/domain/value-objects/primitive/string.vo';

export class ProviderDisplayNameVO extends StringVO {
  private static readonly MAX_LENGTH = 200;

  constructor(value: string) {
    super(value);
    this.ensureValid();
  }

  static create(value: string): ProviderDisplayNameVO {
    return new ProviderDisplayNameVO(value.trim());
  }

  protected ensureValid(): void {
    if (this.value.length === 0) {
      throw new Error('ProviderDisplayName cannot be empty');
    }
    if (this.value.length > ProviderDisplayNameVO.MAX_LENGTH) {
      throw new Error(
        `ProviderDisplayName cannot exceed ${ProviderDisplayNameVO.MAX_LENGTH} characters`,
      );
    }
  }
}

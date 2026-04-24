import { StringVO } from '@shared/domain/value-objects/primitive/string.vo';

export class ProviderIdVO extends StringVO {
  private static readonly MAX_LENGTH = 255;

  constructor(value: string) {
    super(value);
    this.ensureValid();
  }

  static create(value: string): ProviderIdVO {
    return new ProviderIdVO(value.trim());
  }

  protected ensureValid(): void {
    if (this.value.length === 0) {
      throw new Error('ProviderId cannot be empty');
    }
    if (this.value.length > ProviderIdVO.MAX_LENGTH) {
      throw new Error(`ProviderId cannot exceed ${ProviderIdVO.MAX_LENGTH} characters`);
    }
  }
}

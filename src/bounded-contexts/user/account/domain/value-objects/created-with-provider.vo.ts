import { StringVO } from '@shared/domain/value-objects/primitive/string.vo';

const VALID_PROVIDERS = ['email', 'google', 'facebook', 'microsoft', 'apple'] as const;
type CreatedWithProvider = (typeof VALID_PROVIDERS)[number];

export class CreatedWithProviderVO extends StringVO {
  private static readonly MAX_LENGTH = 30;

  constructor(value: string) {
    super(value);
    this.ensureValid();
  }

  static create(value: string): CreatedWithProviderVO {
    return new CreatedWithProviderVO(value.trim());
  }

  protected ensureValid(): void {
    if (this.value.length === 0) {
      throw new Error('CreatedWithProvider cannot be empty');
    }
    if (this.value.length > CreatedWithProviderVO.MAX_LENGTH) {
      throw new Error(
        `CreatedWithProvider cannot exceed ${CreatedWithProviderVO.MAX_LENGTH} characters`,
      );
    }
    if (!VALID_PROVIDERS.includes(this.value as CreatedWithProvider)) {
      throw new Error(`Invalid CreatedWithProvider value: ${this.value}`);
    }
  }
}

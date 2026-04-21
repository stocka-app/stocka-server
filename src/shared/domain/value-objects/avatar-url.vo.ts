import { StringVO } from '@shared/domain/value-objects/primitive/string.vo';

export class AvatarUrlVO extends StringVO {
  private static readonly MAX_LENGTH = 500;

  constructor(value: string) {
    super(value);
    this.ensureValid();
  }

  static create(value: string): AvatarUrlVO {
    return new AvatarUrlVO(value.trim());
  }

  protected ensureValid(): void {
    if (this.value.length === 0) {
      throw new Error('AvatarUrl cannot be empty');
    }
    if (this.value.length > AvatarUrlVO.MAX_LENGTH) {
      throw new Error(`AvatarUrl cannot exceed ${AvatarUrlVO.MAX_LENGTH} characters`);
    }
  }
}

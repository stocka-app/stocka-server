import { StringVO } from '@shared/domain/value-objects/primitive/string.vo';

export class WebsiteVO extends StringVO {
  private static readonly MAX_LENGTH = 255;

  constructor(value: string) {
    super(value);
    this.ensureValid();
  }

  static create(value: string): WebsiteVO {
    return new WebsiteVO(value.trim());
  }

  protected ensureValid(): void {
    if (this.value.length === 0) {
      throw new Error('Website cannot be empty');
    }
    if (this.value.length > WebsiteVO.MAX_LENGTH) {
      throw new Error(`Website cannot exceed ${WebsiteVO.MAX_LENGTH} characters`);
    }
  }
}

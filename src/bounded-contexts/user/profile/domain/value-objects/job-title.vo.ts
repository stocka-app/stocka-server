import { StringVO } from '@shared/domain/value-objects/primitive/string.vo';

export class JobTitleVO extends StringVO {
  private static readonly MAX_LENGTH = 100;

  constructor(value: string) {
    super(value);
    this.ensureValid();
  }

  static create(value: string): JobTitleVO {
    return new JobTitleVO(value.trim());
  }

  protected ensureValid(): void {
    if (this.value.length === 0) {
      throw new Error('JobTitle cannot be empty');
    }
    if (this.value.length > JobTitleVO.MAX_LENGTH) {
      throw new Error(`JobTitle cannot exceed ${JobTitleVO.MAX_LENGTH} characters`);
    }
  }
}

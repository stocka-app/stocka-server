import { StringVO } from '@shared/domain/value-objects/primitive/string.vo';

export class StorageDescriptionVO extends StringVO {
  private static readonly MIN_LENGTH = 5;
  private static readonly MAX_LENGTH = 300;

  constructor(value: string) {
    super(value);
    this.ensureValid();
  }

  static create(value: string): StorageDescriptionVO {
    return new StorageDescriptionVO(value.trim());
  }

  protected ensureValid(): void {
    if (this.value.length < StorageDescriptionVO.MIN_LENGTH) {
      throw new Error(
        `Storage description must be at least ${StorageDescriptionVO.MIN_LENGTH} characters`,
      );
    }
    if (this.value.length > StorageDescriptionVO.MAX_LENGTH) {
      throw new Error(
        `Storage description cannot exceed ${StorageDescriptionVO.MAX_LENGTH} characters`,
      );
    }
  }
}

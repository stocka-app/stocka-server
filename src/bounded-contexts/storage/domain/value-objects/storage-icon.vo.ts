import { StringVO } from '@shared/domain/value-objects/primitive/string.vo';
import { InvalidStorageIconException } from '@storage/domain/exceptions/validation/invalid-storage-icon.exception';

export class StorageIconVO extends StringVO {
  private static readonly MAX_LENGTH = 100;

  constructor(value: string) {
    super(value);
    this.ensureValid();
  }

  static create(value: string): StorageIconVO {
    return new StorageIconVO(value.trim());
  }

  protected ensureValid(): void {
    if (this.value.length === 0) {
      throw new InvalidStorageIconException('Storage icon identifier cannot be empty');
    }
    if (this.value.length > StorageIconVO.MAX_LENGTH) {
      throw new InvalidStorageIconException(
        `Storage icon identifier cannot exceed ${StorageIconVO.MAX_LENGTH} characters`,
      );
    }
  }
}

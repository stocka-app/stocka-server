import { StringVO } from '@shared/domain/value-objects/primitive/string.vo';
import { InvalidStorageAddressException } from '@storage/domain/exceptions/validation/invalid-storage-address.exception';

export class StorageAddressVO extends StringVO {
  private static readonly MAX_LENGTH = 200;

  constructor(value: string) {
    super(value);
    this.ensureValid();
  }

  static create(value: string): StorageAddressVO {
    return new StorageAddressVO(value.trim());
  }

  protected ensureValid(): void {
    if (this.value.length === 0) {
      throw new InvalidStorageAddressException('Storage address cannot be empty');
    }
    if (this.value.length > StorageAddressVO.MAX_LENGTH) {
      throw new InvalidStorageAddressException(
        `Storage address cannot exceed ${StorageAddressVO.MAX_LENGTH} characters`,
      );
    }
  }
}

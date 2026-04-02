import { StringVO } from '@shared/domain/value-objects/primitive/string.vo';

export class StorageNameVO extends StringVO {
  private static readonly MAX_LENGTH = 100;

  constructor(value: string) {
    super(value);
    this.ensureValid();
  }

  static create(value: string): StorageNameVO {
    return new StorageNameVO(value.trim());
  }

  protected ensureValid(): void {
    if (this.value.length === 0) {
      throw new Error('Storage name cannot be empty');
    }
    if (this.value.length > StorageNameVO.MAX_LENGTH) {
      throw new Error(`Storage name cannot exceed ${StorageNameVO.MAX_LENGTH} characters`);
    }
  }

  equals(other: StorageNameVO): boolean {
    return this.value.toLowerCase() === other.getValue().toLowerCase();
  }

  toString(): string {
    return this.value;
  }
}

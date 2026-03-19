export class StorageAddressVO {
  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  static create(raw: string): StorageAddressVO {
    const trimmed = raw.trim();
    if (trimmed.length === 0) {
      throw new Error('Storage address cannot be empty');
    }
    if (trimmed.length > 200) {
      throw new Error('Storage address cannot exceed 200 characters');
    }
    return new StorageAddressVO(trimmed);
  }

  toString(): string {
    return this._value;
  }

  equals(other: StorageAddressVO): boolean {
    return this._value === other._value;
  }
}

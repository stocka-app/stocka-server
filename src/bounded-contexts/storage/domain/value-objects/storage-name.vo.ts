export class StorageNameVO {
  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  static create(raw: string): StorageNameVO {
    const trimmed = raw.trim();
    if (trimmed.length === 0) {
      throw new Error('Storage name cannot be empty');
    }
    if (trimmed.length > 100) {
      throw new Error('Storage name cannot exceed 100 characters');
    }
    return new StorageNameVO(trimmed);
  }

  toString(): string {
    return this._value;
  }

  equals(other: StorageNameVO): boolean {
    return this._value.toLowerCase() === other._value.toLowerCase();
  }
}

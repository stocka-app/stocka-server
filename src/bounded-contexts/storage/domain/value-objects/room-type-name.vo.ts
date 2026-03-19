export class RoomTypeNameVO {
  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  static create(raw: string): RoomTypeNameVO {
    const trimmed = raw.trim();
    if (trimmed.length === 0) {
      throw new Error('Room type name cannot be empty');
    }
    if (trimmed.length > 50) {
      throw new Error('Room type name cannot exceed 50 characters');
    }
    return new RoomTypeNameVO(trimmed);
  }

  toString(): string {
    return this._value;
  }

  equals(other: RoomTypeNameVO): boolean {
    return this._value === other._value;
  }
}

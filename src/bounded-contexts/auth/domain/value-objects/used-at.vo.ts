import { CompoundVO } from '@shared/domain/value-objects/compound/compound.vo';

export class UsedAtVO extends CompoundVO {
  private readonly _value: Date;

  constructor(value: Date) {
    super();
    this._value = new Date(value);
    this.ensureValid();
  }

  private ensureValid(): void {
    if (Number.isNaN(this._value.getTime())) {
      throw new Error('UsedAt date is invalid');
    }
  }

  toDate(): Date {
    return new Date(this._value);
  }

  toString(): string {
    return this._value.toISOString();
  }

  equals(other: UsedAtVO): boolean {
    if (!(other instanceof UsedAtVO)) {
      return false;
    }
    return this._value.getTime() === other._value.getTime();
  }

  static now(): UsedAtVO {
    return new UsedAtVO(new Date());
  }
}

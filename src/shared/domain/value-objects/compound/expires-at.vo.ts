import { CompoundVO } from '@shared/domain/value-objects/compound/compound.vo';

export class ExpiresAtVO extends CompoundVO {
  private readonly _value: Date;

  constructor(value: Date) {
    super();
    this._value = new Date(value);
    this.ensureValid();
  }

  private ensureValid(): void {
    if (Number.isNaN(this._value.getTime())) {
      throw new Error('ExpiresAt date is invalid');
    }
  }

  toDate(): Date {
    return new Date(this._value);
  }

  isExpired(): boolean {
    return new Date() > this._value;
  }

  toString(): string {
    return this._value.toISOString();
  }

  equals(other: ExpiresAtVO): boolean {
    if (!(other instanceof ExpiresAtVO)) {
      return false;
    }
    return this._value.getTime() === other._value.getTime();
  }
}

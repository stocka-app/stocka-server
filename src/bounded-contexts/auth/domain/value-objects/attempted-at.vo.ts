import { CompoundVO } from '@shared/domain/value-objects/compound/compound.vo';
import { InvalidAttemptedAtException } from '@auth/domain/exceptions/invalid-attempted-at.exception';

export class AttemptedAtVO extends CompoundVO {
  private static readonly MAX_FUTURE_TOLERANCE_MS = 5000;

  private readonly _value: Date;

  constructor(value: Date) {
    super();
    this._value = new Date(value);
    this.ensureValid();
  }

  private ensureValid(): void {
    if (Number.isNaN(this._value.getTime())) {
      throw new InvalidAttemptedAtException('Attempted at date is invalid');
    }

    const now = Date.now();
    if (this._value.getTime() > now + AttemptedAtVO.MAX_FUTURE_TOLERANCE_MS) {
      throw new InvalidAttemptedAtException('Attempted at date cannot be in the future');
    }
  }

  toDate(): Date {
    return new Date(this._value);
  }

  toString(): string {
    return this._value.toISOString();
  }

  equals(other: AttemptedAtVO): boolean {
    if (!(other instanceof AttemptedAtVO)) {
      return false;
    }
    return this._value.getTime() === other._value.getTime();
  }

  isBefore(other: AttemptedAtVO): boolean {
    return this._value.getTime() < other._value.getTime();
  }

  isAfter(other: AttemptedAtVO): boolean {
    return this._value.getTime() > other._value.getTime();
  }

  static now(): AttemptedAtVO {
    return new AttemptedAtVO(new Date());
  }
}

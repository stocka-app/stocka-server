import { CompoundVO } from '@shared/domain/value-objects/compound/compound.vo';
import { InvalidEmailFormatException } from '@shared/domain/exceptions/invalid-email-format.exception';

export class EmailVO extends CompoundVO {
  private static readonly EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  private readonly _value: string;

  constructor(value: string) {
    super();
    this._value = value.trim().toLowerCase();
    this.ensureValid();
  }

  private ensureValid(): void {
    if (!EmailVO.EMAIL_PATTERN.test(this._value)) {
      throw new InvalidEmailFormatException(this._value);
    }
  }

  toString(): string {
    return this._value;
  }

  equals(other: EmailVO): boolean {
    if (!(other instanceof EmailVO)) {
      return false;
    }
    return this._value === other._value;
  }
}

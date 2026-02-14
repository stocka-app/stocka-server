import { CompoundVO } from '@shared/domain/value-objects/compound/compound.vo';
import { DomainException } from '@shared/domain/exceptions/domain.exception';

class InvalidVerificationCodeException extends DomainException {
  constructor(message: string) {
    super(message, 'INVALID_VERIFICATION_CODE', [{ field: 'code', message }]);
  }
}

export class VerificationCodeVO extends CompoundVO {
  // Allowed characters: A-Z (without O, I, L) + 2-9 = 32 characters
  private static readonly CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  private static readonly CODE_LENGTH = 6;

  private readonly _value: string;

  // ALWAYS receives a value - never generates
  constructor(value: string) {
    super();
    this._value = value.toUpperCase().trim();
    this.ensureValid();
  }

  private ensureValid(): void {
    if (this._value.length !== VerificationCodeVO.CODE_LENGTH) {
      throw new InvalidVerificationCodeException(
        `Verification code must be ${VerificationCodeVO.CODE_LENGTH} characters`,
      );
    }

    for (const char of this._value) {
      if (!VerificationCodeVO.CHARSET.includes(char)) {
        throw new InvalidVerificationCodeException(
          `Invalid character in verification code: ${char}`,
        );
      }
    }
  }

  toString(): string {
    return this._value;
  }

  equals(other: VerificationCodeVO): boolean {
    if (!(other instanceof VerificationCodeVO)) {
      return false;
    }
    return this._value === other._value;
  }

  static getCharset(): string {
    return VerificationCodeVO.CHARSET;
  }

  static getCodeLength(): number {
    return VerificationCodeVO.CODE_LENGTH;
  }
}

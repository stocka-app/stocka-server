import { CompoundVO } from '@/shared/domain/value-objects/compound/compound.vo';
import { DomainException } from '@/shared/domain/exceptions/domain.exception';

class InvalidVerificationTypeException extends DomainException {
  constructor(value: string) {
    super(`Invalid verification type: ${value}`, 'INVALID_VERIFICATION_TYPE', [
      { field: 'verificationType', message: `Invalid verification type: ${value}` },
    ]);
  }
}

export enum VerificationTypeEnum {
  EMAIL_VERIFICATION = 'email_verification',
  PASSWORD_RESET = 'password_reset',
  TWO_FACTOR = 'two_factor',
}

export class VerificationTypeVO extends CompoundVO {
  private static readonly VALID_TYPES = Object.values(VerificationTypeEnum);

  private readonly _value: VerificationTypeEnum;

  constructor(value: string) {
    super();
    this._value = value as VerificationTypeEnum;
    this.ensureValid();
  }

  private ensureValid(): void {
    if (!VerificationTypeVO.VALID_TYPES.includes(this._value)) {
      throw new InvalidVerificationTypeException(this._value);
    }
  }

  toString(): string {
    return this._value;
  }

  equals(other: VerificationTypeVO): boolean {
    if (!(other instanceof VerificationTypeVO)) {
      return false;
    }
    return this._value === other._value;
  }

  isEmailVerification(): boolean {
    return this._value === VerificationTypeEnum.EMAIL_VERIFICATION;
  }

  isPasswordReset(): boolean {
    return this._value === VerificationTypeEnum.PASSWORD_RESET;
  }

  isTwoFactor(): boolean {
    return this._value === VerificationTypeEnum.TWO_FACTOR;
  }

  static emailVerification(): VerificationTypeVO {
    return new VerificationTypeVO(VerificationTypeEnum.EMAIL_VERIFICATION);
  }

  static passwordReset(): VerificationTypeVO {
    return new VerificationTypeVO(VerificationTypeEnum.PASSWORD_RESET);
  }

  static twoFactor(): VerificationTypeVO {
    return new VerificationTypeVO(VerificationTypeEnum.TWO_FACTOR);
  }
}

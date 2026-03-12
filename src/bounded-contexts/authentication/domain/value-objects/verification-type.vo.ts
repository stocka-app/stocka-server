import { CompoundVO } from '@shared/domain/value-objects/compound/compound.vo';
import { InvalidVerificationTypeException } from '@authentication/domain/exceptions/invalid-verification-type.exception';

export enum VerificationTypeEnum {
  EMAIL_VERIFICATION = 'email_verification',
  PASSWORD_RESET = 'password_reset',
  TWO_FACTOR = 'two_factor',
  SIGN_IN = 'sign_in',
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

  static signIn(): VerificationTypeVO {
    return new VerificationTypeVO(VerificationTypeEnum.SIGN_IN);
  }

  isSignIn(): boolean {
    return this._value === VerificationTypeEnum.SIGN_IN;
  }
}

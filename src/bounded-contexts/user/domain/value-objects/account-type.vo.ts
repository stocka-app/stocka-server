import { CompoundVO } from '@shared/domain/value-objects/compound/compound.vo';
import { DomainException } from '@shared/domain/exceptions/domain.exception';

class InvalidAccountTypeException extends DomainException {
  constructor(value: string) {
    super(`Invalid account type: ${value}`, 'INVALID_ACCOUNT_TYPE', [
      { field: 'accountType', message: `Invalid account type: ${value}` },
    ]);
  }
}

export enum AccountTypeEnum {
  MANUAL = 'manual',
  SOCIAL = 'social',
  FLEXIBLE = 'flexible',
}

export class AccountTypeVO extends CompoundVO {
  private static readonly VALID_TYPES = Object.values(AccountTypeEnum);

  private readonly _value: AccountTypeEnum;

  constructor(value: string) {
    super();
    this._value = value as AccountTypeEnum;
    this.ensureValid();
  }

  private ensureValid(): void {
    if (!AccountTypeVO.VALID_TYPES.includes(this._value)) {
      throw new InvalidAccountTypeException(this._value);
    }
  }

  toString(): string {
    return this._value;
  }

  equals(other: AccountTypeVO): boolean {
    if (!(other instanceof AccountTypeVO)) {
      return false;
    }
    return this._value === other._value;
  }

  isManual(): boolean {
    return this._value === AccountTypeEnum.MANUAL;
  }

  isSocial(): boolean {
    return this._value === AccountTypeEnum.SOCIAL;
  }

  isFlexible(): boolean {
    return this._value === AccountTypeEnum.FLEXIBLE;
  }

  static manual(): AccountTypeVO {
    return new AccountTypeVO(AccountTypeEnum.MANUAL);
  }

  static social(): AccountTypeVO {
    return new AccountTypeVO(AccountTypeEnum.SOCIAL);
  }

  static flexible(): AccountTypeVO {
    return new AccountTypeVO(AccountTypeEnum.FLEXIBLE);
  }
}

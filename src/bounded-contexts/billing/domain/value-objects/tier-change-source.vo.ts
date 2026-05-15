import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { EnumValueObject } from '@shared/domain/value-objects/compound/enum-value-object.vo';

export enum TierChangeSourceEnum {
  USER_REQUEST = 'USER_REQUEST',
  DUNNING = 'DUNNING',
  ADMIN = 'ADMIN',
}

export class InvalidTierChangeSourceException extends DomainException {
  constructor(value: string) {
    super(`Invalid tier change source: ${value}`, 'INVALID_TIER_CHANGE_SOURCE', [
      { field: 'source', message: `Invalid tier change source: ${value}` },
    ]);
  }
}

export class TierChangeSourceVO extends EnumValueObject<TierChangeSourceEnum> {
  constructor(value: string) {
    super(value, Object.values(TierChangeSourceEnum));
  }

  protected invalidException(value: string): DomainException {
    return new InvalidTierChangeSourceException(value);
  }

  isUserInitiated(): boolean {
    return this._value === TierChangeSourceEnum.USER_REQUEST;
  }

  isAutomated(): boolean {
    return this._value === TierChangeSourceEnum.DUNNING;
  }

  isAdminInitiated(): boolean {
    return this._value === TierChangeSourceEnum.ADMIN;
  }

  static userRequest(): TierChangeSourceVO {
    return new TierChangeSourceVO(TierChangeSourceEnum.USER_REQUEST);
  }

  static dunning(): TierChangeSourceVO {
    return new TierChangeSourceVO(TierChangeSourceEnum.DUNNING);
  }

  static admin(): TierChangeSourceVO {
    return new TierChangeSourceVO(TierChangeSourceEnum.ADMIN);
  }
}

import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { EnumValueObject } from '@shared/domain/value-objects/compound/enum-value-object.vo';
import { InvalidTierChangeSourceException } from '@billing/domain/exceptions/validation/invalid-tier-change-source.exception';

export enum TierChangeSourceEnum {
  USER_REQUEST = 'USER_REQUEST',
  DUNNING = 'DUNNING',
  ADMIN = 'ADMIN',
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

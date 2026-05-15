import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { EnumValueObject } from '@shared/domain/value-objects/compound/enum-value-object.vo';

export enum TierChangeRevertReasonEnum {
  USER_CHANGED_MIND = 'USER_CHANGED_MIND',
  ADMIN_OVERRIDE = 'ADMIN_OVERRIDE',
  BILLING_ERROR = 'BILLING_ERROR',
}

export class InvalidTierChangeRevertReasonException extends DomainException {
  constructor(value: string) {
    super(`Invalid tier change revert reason: ${value}`, 'INVALID_TIER_CHANGE_REVERT_REASON', [
      { field: 'reason', message: `Invalid tier change revert reason: ${value}` },
    ]);
  }
}

export class TierChangeRevertReasonVO extends EnumValueObject<TierChangeRevertReasonEnum> {
  constructor(value: string) {
    super(value, Object.values(TierChangeRevertReasonEnum));
  }

  protected invalidException(value: string): DomainException {
    return new InvalidTierChangeRevertReasonException(value);
  }

  isUserInitiated(): boolean {
    return this._value === TierChangeRevertReasonEnum.USER_CHANGED_MIND;
  }

  isAdminInitiated(): boolean {
    return this._value === TierChangeRevertReasonEnum.ADMIN_OVERRIDE;
  }

  isSystemError(): boolean {
    return this._value === TierChangeRevertReasonEnum.BILLING_ERROR;
  }

  static userChangedMind(): TierChangeRevertReasonVO {
    return new TierChangeRevertReasonVO(TierChangeRevertReasonEnum.USER_CHANGED_MIND);
  }

  static adminOverride(): TierChangeRevertReasonVO {
    return new TierChangeRevertReasonVO(TierChangeRevertReasonEnum.ADMIN_OVERRIDE);
  }

  static billingError(): TierChangeRevertReasonVO {
    return new TierChangeRevertReasonVO(TierChangeRevertReasonEnum.BILLING_ERROR);
  }
}

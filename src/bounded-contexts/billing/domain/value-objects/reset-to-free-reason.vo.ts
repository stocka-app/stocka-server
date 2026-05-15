import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { EnumValueObject } from '@shared/domain/value-objects/compound/enum-value-object.vo';
import { InvalidResetToFreeReasonException } from '@billing/domain/exceptions/validation/invalid-reset-to-free-reason.exception';

export enum ResetToFreeReasonEnum {
  CANCELLATION_EFFECTIVE = 'CANCELLATION_EFFECTIVE',
  ENTERPRISE_CONTRACT_ENDED = 'ENTERPRISE_CONTRACT_ENDED',
}

/**
 * Reasons for which a subscription can be reset back to FREE. Notably does
 * NOT include `DUNNING_DOWNGRADE` — that path has its own dedicated method
 * (`subscription.executeDunningDowngrade`) which creates a TierChange record
 * for the archive timeline, whereas `resetToFree` is a clean termination
 * without long-running archive lifecycle.
 */
export class ResetToFreeReasonVO extends EnumValueObject<ResetToFreeReasonEnum> {
  constructor(value: string) {
    super(value, Object.values(ResetToFreeReasonEnum));
  }

  protected invalidException(value: string): DomainException {
    return new InvalidResetToFreeReasonException(value);
  }

  isCancellation(): boolean {
    return this._value === ResetToFreeReasonEnum.CANCELLATION_EFFECTIVE;
  }

  isEnterpriseEnd(): boolean {
    return this._value === ResetToFreeReasonEnum.ENTERPRISE_CONTRACT_ENDED;
  }

  static cancellationEffective(): ResetToFreeReasonVO {
    return new ResetToFreeReasonVO(ResetToFreeReasonEnum.CANCELLATION_EFFECTIVE);
  }

  static enterpriseContractEnded(): ResetToFreeReasonVO {
    return new ResetToFreeReasonVO(ResetToFreeReasonEnum.ENTERPRISE_CONTRACT_ENDED);
  }
}

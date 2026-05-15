import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { EnumValueObject } from '@shared/domain/value-objects/compound/enum-value-object.vo';
import { InvalidSubscriptionStatusException } from '@billing/domain/exceptions/validation/invalid-subscription-status.exception';

export enum SubscriptionStatusEnum {
  ACTIVE = 'ACTIVE',
  PAST_DUE = 'PAST_DUE',
  GRACE = 'GRACE',
  CANCELLED = 'CANCELLED',
  INCOMPLETE = 'INCOMPLETE',
}

export class SubscriptionStatusVO extends EnumValueObject<SubscriptionStatusEnum> {
  constructor(value: string) {
    super(value, Object.values(SubscriptionStatusEnum));
  }

  protected invalidException(value: string): DomainException {
    return new InvalidSubscriptionStatusException(value);
  }

  isActive(): boolean {
    return this._value === SubscriptionStatusEnum.ACTIVE;
  }

  isPastDue(): boolean {
    return this._value === SubscriptionStatusEnum.PAST_DUE;
  }

  isInGrace(): boolean {
    return this._value === SubscriptionStatusEnum.GRACE;
  }

  isCancelled(): boolean {
    return this._value === SubscriptionStatusEnum.CANCELLED;
  }

  isIncomplete(): boolean {
    return this._value === SubscriptionStatusEnum.INCOMPLETE;
  }

  isTerminal(): boolean {
    return this._value === SubscriptionStatusEnum.CANCELLED;
  }

  static active(): SubscriptionStatusVO {
    return new SubscriptionStatusVO(SubscriptionStatusEnum.ACTIVE);
  }

  static pastDue(): SubscriptionStatusVO {
    return new SubscriptionStatusVO(SubscriptionStatusEnum.PAST_DUE);
  }

  static grace(): SubscriptionStatusVO {
    return new SubscriptionStatusVO(SubscriptionStatusEnum.GRACE);
  }

  static cancelled(): SubscriptionStatusVO {
    return new SubscriptionStatusVO(SubscriptionStatusEnum.CANCELLED);
  }

  static incomplete(): SubscriptionStatusVO {
    return new SubscriptionStatusVO(SubscriptionStatusEnum.INCOMPLETE);
  }
}

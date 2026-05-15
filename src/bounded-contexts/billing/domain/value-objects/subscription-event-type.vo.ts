import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { EnumValueObject } from '@shared/domain/value-objects/compound/enum-value-object.vo';

export enum SubscriptionEventTypeEnum {
  UPGRADE_REQUESTED = 'UPGRADE_REQUESTED',
  UPGRADE_COMMITTED = 'UPGRADE_COMMITTED',
  DOWNGRADE_REQUESTED = 'DOWNGRADE_REQUESTED',
  DOWNGRADE_APPLIED = 'DOWNGRADE_APPLIED',
  PENDING_DOWNGRADE_REVERTED = 'PENDING_DOWNGRADE_REVERTED',
  CANCEL_REQUESTED = 'CANCEL_REQUESTED',
  REACTIVATED = 'REACTIVATED',
  CANCELLED = 'CANCELLED',
  RENEWED = 'RENEWED',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  DUNNING_GRACE_STARTED = 'DUNNING_GRACE_STARTED',
  DUNNING_GRACE_RECOVERED = 'DUNNING_GRACE_RECOVERED',
  DUNNING_DOWNGRADE_EXECUTED = 'DUNNING_DOWNGRADE_EXECUTED',
  ENTERPRISE_PLAN_ASSIGNED = 'ENTERPRISE_PLAN_ASSIGNED',
  RESET_TO_FREE = 'RESET_TO_FREE',
}

const PAYMENT_RELATED = new Set<SubscriptionEventTypeEnum>([
  SubscriptionEventTypeEnum.RENEWED,
  SubscriptionEventTypeEnum.PAYMENT_FAILED,
  SubscriptionEventTypeEnum.DUNNING_GRACE_STARTED,
  SubscriptionEventTypeEnum.DUNNING_GRACE_RECOVERED,
  SubscriptionEventTypeEnum.DUNNING_DOWNGRADE_EXECUTED,
]);

const TIER_CHANGE_RELATED = new Set<SubscriptionEventTypeEnum>([
  SubscriptionEventTypeEnum.UPGRADE_REQUESTED,
  SubscriptionEventTypeEnum.UPGRADE_COMMITTED,
  SubscriptionEventTypeEnum.DOWNGRADE_REQUESTED,
  SubscriptionEventTypeEnum.DOWNGRADE_APPLIED,
  SubscriptionEventTypeEnum.PENDING_DOWNGRADE_REVERTED,
  SubscriptionEventTypeEnum.DUNNING_DOWNGRADE_EXECUTED,
  SubscriptionEventTypeEnum.ENTERPRISE_PLAN_ASSIGNED,
  SubscriptionEventTypeEnum.RESET_TO_FREE,
]);

const LIFECYCLE = new Set<SubscriptionEventTypeEnum>([
  SubscriptionEventTypeEnum.UPGRADE_COMMITTED,
  SubscriptionEventTypeEnum.CANCEL_REQUESTED,
  SubscriptionEventTypeEnum.REACTIVATED,
  SubscriptionEventTypeEnum.CANCELLED,
  SubscriptionEventTypeEnum.RESET_TO_FREE,
  SubscriptionEventTypeEnum.ENTERPRISE_PLAN_ASSIGNED,
]);

export class InvalidSubscriptionEventTypeException extends DomainException {
  constructor(value: string) {
    super(`Invalid subscription event type: ${value}`, 'INVALID_SUBSCRIPTION_EVENT_TYPE', [
      { field: 'eventType', message: `Invalid subscription event type: ${value}` },
    ]);
  }
}

export class SubscriptionEventTypeVO extends EnumValueObject<SubscriptionEventTypeEnum> {
  constructor(value: string) {
    super(value, Object.values(SubscriptionEventTypeEnum));
  }

  protected invalidException(value: string): DomainException {
    return new InvalidSubscriptionEventTypeException(value);
  }

  isPaymentRelated(): boolean {
    return PAYMENT_RELATED.has(this._value);
  }

  isTierChangeRelated(): boolean {
    return TIER_CHANGE_RELATED.has(this._value);
  }

  isLifecycle(): boolean {
    return LIFECYCLE.has(this._value);
  }
}

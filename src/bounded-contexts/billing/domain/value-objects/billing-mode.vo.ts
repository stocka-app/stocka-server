import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { EnumValueObject } from '@shared/domain/value-objects/compound/enum-value-object.vo';
import { InvalidBillingModeException } from '@billing/domain/exceptions/validation/invalid-billing-mode.exception';

export enum BillingModeEnum {
  MANUAL = 'MANUAL',
  STRIPE_INVOICING = 'STRIPE_INVOICING',
  STRIPE_SUBSCRIPTION = 'STRIPE_SUBSCRIPTION',
}

/**
 * `BillingModeVO` is **derived state**, never persisted. It reflects how a
 * subscription is currently billed:
 *
 *   - MANUAL: no payment provider (e.g. wire transfer + CFDI emitted by the
 *     tenant's accounting system, recorded internally for audit)
 *   - STRIPE_INVOICING: Stripe customer exists but no recurring subscription;
 *     ops issues invoices manually from the Stripe Dashboard
 *   - STRIPE_SUBSCRIPTION: full Stripe Subscription with auto-charged renewal
 *
 * The `fromSubscriptionState(...)` factory is the canonical derivation and
 * lives on `SubscriptionModel.get billingMode()`. It's added here (rather
 * than the StripeIdsVO file) because BillingMode is the answer; StripeIds
 * is the input.
 *
 * Decoupling note: this factory takes plain primitives so it can be invoked
 * before StripeIdsVO and PaymentProviderCodeVO are constructed — useful for
 * mappers that read the entity row before lifting it into VOs.
 */
export class BillingModeVO extends EnumValueObject<BillingModeEnum> {
  constructor(value: string) {
    super(value, Object.values(BillingModeEnum));
  }

  protected invalidException(value: string): DomainException {
    return new InvalidBillingModeException(value);
  }

  isManual(): boolean {
    return this._value === BillingModeEnum.MANUAL;
  }

  isStripeInvoicing(): boolean {
    return this._value === BillingModeEnum.STRIPE_INVOICING;
  }

  isStripeSubscription(): boolean {
    return this._value === BillingModeEnum.STRIPE_SUBSCRIPTION;
  }

  isStripeBacked(): boolean {
    return this.isStripeInvoicing() || this.isStripeSubscription();
  }

  static manual(): BillingModeVO {
    return new BillingModeVO(BillingModeEnum.MANUAL);
  }

  static stripeInvoicing(): BillingModeVO {
    return new BillingModeVO(BillingModeEnum.STRIPE_INVOICING);
  }

  static stripeSubscription(): BillingModeVO {
    return new BillingModeVO(BillingModeEnum.STRIPE_SUBSCRIPTION);
  }

  /**
   * Derives the billing mode from raw subscription state. Returns null when
   * the combination is invalid — callers should treat that as an invariant
   * violation (the aggregate's `(tier × billingMode)` matrix forbids it).
   */
  static fromSubscriptionState(props: {
    providerCode: string | null;
    customerId: string | null;
    subscriptionId: string | null;
  }): BillingModeVO | null {
    if (props.providerCode === null) {
      if (props.customerId !== null || props.subscriptionId !== null) {
        return null;
      }
      return BillingModeVO.manual();
    }
    if (props.subscriptionId !== null && props.customerId !== null) {
      return BillingModeVO.stripeSubscription();
    }
    if (props.subscriptionId === null && props.customerId !== null) {
      return BillingModeVO.stripeInvoicing();
    }
    return null;
  }
}

import { CompoundVO } from '@shared/domain/value-objects/compound/compound.vo';
import { InvalidStripeIdsException } from '@billing/domain/exceptions/validation/invalid-stripe-ids.exception';

export interface StripeIdsProps {
  customerId: string | null;
  subscriptionId: string | null;
  priceId: string | null;
}

/**
 * Bundle of external Stripe identifiers attached to a subscription. The three
 * IDs travel together because they share an invariant:
 *
 *   subscriptionId !== null  ⇒  customerId !== null
 *
 * In other words, you cannot have a Stripe Subscription without first having
 * a Stripe Customer. The reverse is fine: a customer may exist with no active
 * subscription (Pattern B "Stripe Invoicing" — ops issues one-off invoices to
 * an existing customer without a recurring sub).
 *
 * All three IDs can be `null` simultaneously — that's the "unlinked" state
 * for a fresh FREE subscription or after `resetToFree()`. The
 * `(tier × billingMode)` matrix in plan 03 §2.6 enforces which combinations
 * are valid for which tiers.
 *
 * Mutations follow the immutable-with pattern: `withCustomerId`,
 * `withSubscription`, `withoutSubscription` each return a new instance.
 */
export class StripeIdsVO extends CompoundVO {
  private readonly _customerId: string | null;
  private readonly _subscriptionId: string | null;
  private readonly _priceId: string | null;

  constructor(props: StripeIdsProps) {
    super();
    this._customerId = props.customerId;
    this._subscriptionId = props.subscriptionId;
    this._priceId = props.priceId;
    this.ensureValid();
  }

  private ensureValid(): void {
    if (this._subscriptionId !== null && this._customerId === null) {
      throw new InvalidStripeIdsException('subscriptionId present without customerId');
    }
    if (this._priceId !== null && this._subscriptionId === null) {
      throw new InvalidStripeIdsException('priceId present without subscriptionId');
    }
  }

  static empty(): StripeIdsVO {
    return new StripeIdsVO({ customerId: null, subscriptionId: null, priceId: null });
  }

  getCustomerId(): string | null {
    return this._customerId;
  }

  getSubscriptionId(): string | null {
    return this._subscriptionId;
  }

  getPriceId(): string | null {
    return this._priceId;
  }

  hasActiveSubscription(): boolean {
    return this._subscriptionId !== null;
  }

  hasCustomer(): boolean {
    return this._customerId !== null;
  }

  isUnlinked(): boolean {
    return this._customerId === null && this._subscriptionId === null && this._priceId === null;
  }

  withCustomerId(customerId: string): StripeIdsVO {
    return new StripeIdsVO({
      customerId,
      subscriptionId: this._subscriptionId,
      priceId: this._priceId,
    });
  }

  withSubscription(subscriptionId: string, priceId: string): StripeIdsVO {
    return new StripeIdsVO({
      customerId: this._customerId,
      subscriptionId,
      priceId,
    });
  }

  withoutSubscription(): StripeIdsVO {
    return new StripeIdsVO({
      customerId: this._customerId,
      subscriptionId: null,
      priceId: null,
    });
  }

  toString(): string {
    return `customerId=${this._customerId ?? 'null'}, subscriptionId=${this._subscriptionId ?? 'null'}, priceId=${this._priceId ?? 'null'}`;
  }

  equals(other: StripeIdsVO): boolean {
    if (!(other instanceof StripeIdsVO)) {
      return false;
    }
    return (
      this._customerId === other._customerId &&
      this._subscriptionId === other._subscriptionId &&
      this._priceId === other._priceId
    );
  }
}

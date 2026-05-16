import { BaseModel } from '@shared/domain/base/base.model';
import { UUIDVO } from '@shared/domain/value-objects/compound/uuid.vo';
import { BillingModeVO } from '@billing/domain/value-objects/billing-mode.vo';
import { PaymentProviderCodeVO } from '@billing/domain/value-objects/payment-provider-code.vo';
import { StripeIdsVO } from '@billing/domain/value-objects/stripe-ids.vo';
import { SubscriptionStatusVO } from '@billing/domain/value-objects/subscription-status.vo';

export interface SubscriptionModelCreateProps {
  uuid: string;
  tenantUUID: string;
}

export interface SubscriptionModelReconstituteProps {
  id: number;
  uuid: UUIDVO;
  tenantUUID: UUIDVO;
  pricingPlanId: number | null;
  provider: PaymentProviderCodeVO | null;
  stripeIds: StripeIdsVO;
  status: SubscriptionStatusVO;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  trialEndsAt: Date | null;
  gracePeriodEndsAt: Date | null;
  metadata: Record<string, unknown> | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubscriptionModelChanges {
  pricingPlanId?: number | null;
  provider?: PaymentProviderCodeVO | null;
  stripeIds?: StripeIdsVO;
  status?: SubscriptionStatusVO;
  currentPeriodStart?: Date | null;
  currentPeriodEnd?: Date | null;
  cancelAtPeriodEnd?: boolean;
  trialEndsAt?: Date | null;
  gracePeriodEndsAt?: Date | null;
  metadata?: Record<string, unknown> | null;
  archivedAt?: Date | null;
  updatedAt?: Date;
}

/**
 * Pure data carrier for a Subscription — immutable snapshot of the entity's
 * state. Every business operation lives in `SubscriptionAggregate`. The
 * `with()` method produces successor snapshots; the model itself is never
 * mutated in place.
 *
 * `create()` always materializes the FREE initial state (no provider,
 * no Stripe binding, status=ACTIVE). All subsequent transitions to paid
 * tiers, dunning, enterprise, etc., are aggregate concerns and flow
 * through `with()`.
 */
export class SubscriptionModel extends BaseModel {
  constructor(
    public readonly uuid: UUIDVO,
    public readonly tenantUUID: UUIDVO,
    public readonly pricingPlanId: number | null,
    public readonly provider: PaymentProviderCodeVO | null,
    public readonly stripeIds: StripeIdsVO,
    public readonly status: SubscriptionStatusVO,
    public readonly currentPeriodStart: Date | null,
    public readonly currentPeriodEnd: Date | null,
    public readonly cancelAtPeriodEnd: boolean,
    public readonly trialEndsAt: Date | null,
    public readonly gracePeriodEndsAt: Date | null,
    public readonly metadata: Record<string, unknown> | null,
    public readonly archivedAt: Date | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly id?: number,
  ) {
    super();
  }

  static create(props: SubscriptionModelCreateProps): SubscriptionModel {
    const now = new Date();
    return new SubscriptionModel(
      new UUIDVO(props.uuid),
      new UUIDVO(props.tenantUUID),
      null,
      null,
      StripeIdsVO.empty(),
      SubscriptionStatusVO.active(),
      null,
      null,
      false,
      null,
      null,
      null,
      null,
      now,
      now,
    );
  }

  static reconstitute(props: SubscriptionModelReconstituteProps): SubscriptionModel {
    return new SubscriptionModel(
      props.uuid,
      props.tenantUUID,
      props.pricingPlanId,
      props.provider,
      props.stripeIds,
      props.status,
      props.currentPeriodStart,
      props.currentPeriodEnd,
      props.cancelAtPeriodEnd,
      props.trialEndsAt,
      props.gracePeriodEndsAt,
      props.metadata,
      props.archivedAt,
      props.createdAt,
      props.updatedAt,
      props.id,
    );
  }

  with(changes: SubscriptionModelChanges): SubscriptionModel {
    return new SubscriptionModel(
      this.uuid,
      this.tenantUUID,
      changes.pricingPlanId !== undefined ? changes.pricingPlanId : this.pricingPlanId,
      changes.provider !== undefined ? changes.provider : this.provider,
      changes.stripeIds ?? this.stripeIds,
      changes.status ?? this.status,
      changes.currentPeriodStart !== undefined
        ? changes.currentPeriodStart
        : this.currentPeriodStart,
      changes.currentPeriodEnd !== undefined ? changes.currentPeriodEnd : this.currentPeriodEnd,
      changes.cancelAtPeriodEnd ?? this.cancelAtPeriodEnd,
      changes.trialEndsAt !== undefined ? changes.trialEndsAt : this.trialEndsAt,
      changes.gracePeriodEndsAt !== undefined ? changes.gracePeriodEndsAt : this.gracePeriodEndsAt,
      changes.metadata !== undefined ? changes.metadata : this.metadata,
      changes.archivedAt !== undefined ? changes.archivedAt : this.archivedAt,
      this.createdAt,
      changes.updatedAt ?? new Date(),
      this.id,
    );
  }

  // ── Pure derived queries (no mutation) ────────────────────────────────

  isFree(): boolean {
    return this.pricingPlanId === null && this.provider === null;
  }

  hasStripeBinding(): boolean {
    return this.stripeIds.hasActiveSubscription();
  }

  isInGrace(): boolean {
    return this.status.isInGrace() && this.gracePeriodEndsAt !== null;
  }

  isCancelled(): boolean {
    return this.status.isCancelled();
  }

  /**
   * Derives the operational billing mode from `provider + stripeIds`.
   * Throws if the combination is invalid — that's a data invariant the
   * aggregate is supposed to enforce via the `(tier × billingMode)` matrix.
   * If you see this error in production, the aggregate let an invalid
   * state slip through.
   */
  get billingMode(): BillingModeVO {
    const mode = BillingModeVO.fromSubscriptionState({
      providerCode: this.provider?.getValue() ?? null,
      customerId: this.stripeIds.getCustomerId(),
      subscriptionId: this.stripeIds.getSubscriptionId(),
    });
    if (mode === null) {
      throw new Error(
        `Subscription ${this.uuid.toString()} has an invalid (provider, stripeIds) combination`,
      );
    }
    return mode;
  }
}

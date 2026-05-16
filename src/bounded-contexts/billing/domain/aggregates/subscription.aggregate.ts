import { AggregateRoot } from '@shared/domain/base/aggregate-root';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result, err, ok } from '@shared/domain/result';
import { TierVO } from '@tenant/domain/value-objects/tier.vo';
import { CannotReactivateException } from '@billing/domain/exceptions/business/cannot-reactivate.exception';
import { EnterprisePurchaseNotSupportedException } from '@billing/domain/exceptions/business/enterprise-purchase-not-supported.exception';
import { InvalidBillingModeForTierException } from '@billing/domain/exceptions/business/invalid-billing-mode-for-tier.exception';
import { NoPendingDowngradeException } from '@billing/domain/exceptions/business/no-pending-downgrade.exception';
import { NotADowngradeException } from '@billing/domain/exceptions/business/not-a-downgrade.exception';
import { NotAnUpgradeException } from '@billing/domain/exceptions/business/not-an-upgrade.exception';
import { SameTierChangeException } from '@billing/domain/exceptions/business/same-tier-change.exception';
import { SubscriptionNotActiveException } from '@billing/domain/exceptions/business/subscription-not-active.exception';
import { SubscriptionNotAssignableToEnterpriseException } from '@billing/domain/exceptions/business/subscription-not-assignable-to-enterprise.exception';
import { UpgradeNotInProgressException } from '@billing/domain/exceptions/business/upgrade-not-in-progress.exception';
import { DowngradeAppliedEvent } from '@billing/domain/events/downgrade-applied.event';
import { DowngradeRequestedEvent } from '@billing/domain/events/downgrade-requested.event';
import { DunningGraceRecoveredEvent } from '@billing/domain/events/dunning-grace-recovered.event';
import { DunningGraceStartedEvent } from '@billing/domain/events/dunning-grace-started.event';
import { EnterprisePlanAssignedEvent } from '@billing/domain/events/enterprise-plan-assigned.event';
import { PaymentFailedEvent } from '@billing/domain/events/payment-failed.event';
import { PendingDowngradeRevertedEvent } from '@billing/domain/events/pending-downgrade-reverted.event';
import { SubscriptionCancelRequestedEvent } from '@billing/domain/events/subscription-cancel-requested.event';
import { SubscriptionCancelledEvent } from '@billing/domain/events/subscription-cancelled.event';
import { SubscriptionReactivatedEvent } from '@billing/domain/events/subscription-reactivated.event';
import { SubscriptionRenewedEvent } from '@billing/domain/events/subscription-renewed.event';
import { SubscriptionResetToFreeEvent } from '@billing/domain/events/subscription-reset-to-free.event';
import { UpgradeCommittedEvent } from '@billing/domain/events/upgrade-committed.event';
import { UpgradeRequestedEvent } from '@billing/domain/events/upgrade-requested.event';
import { SubscriptionModel } from '@billing/domain/models/subscription.model';
import { BillingModeVO } from '@billing/domain/value-objects/billing-mode.vo';
import { PaymentProviderCodeVO } from '@billing/domain/value-objects/payment-provider-code.vo';
import { ResetToFreeReasonVO } from '@billing/domain/value-objects/reset-to-free-reason.vo';
import { StripeIdsVO } from '@billing/domain/value-objects/stripe-ids.vo';
import {
  SubscriptionStatusEnum,
  SubscriptionStatusVO,
} from '@billing/domain/value-objects/subscription-status.vo';
import { TierChangeRevertReasonVO } from '@billing/domain/value-objects/tier-change-revert-reason.vo';
import { TierChangeSourceVO } from '@billing/domain/value-objects/tier-change-source.vo';
import { TierChangeAggregate } from '@billing/domain/aggregates/tier-change.aggregate';

export interface CreateFreeProps {
  uuid: string;
  tenantUUID: string;
  actorUUID: string;
}

export interface UpgradeProps {
  currentTier: TierVO;
  targetTier: TierVO;
  targetPricingPlanId: number;
  actorUUID: string;
}

export interface DowngradeProps {
  currentTier: TierVO;
  targetTier: TierVO;
  targetPricingPlanId: number;
  feasibility: { allowed: true };
  coldDownEndsAt: Date;
  actorUUID: string;
}

export interface CancelProps {
  atPeriodEnd: boolean;
  effectiveAt: Date | null;
  actorUUID: string;
}

export interface RevertPendingDowngradeProps {
  tierChange: TierChangeAggregate;
  reason: TierChangeRevertReasonVO;
  actorUUID: string;
}

export interface CommitUpgradeProps {
  tier: TierVO;
  pricingPlanId: number;
  stripeIds: StripeIdsVO;
  period: { start: Date; end: Date };
}

export interface ApplyPendingDowngradeProps {
  tierChange: TierChangeAggregate;
  targetTier: TierVO;
}

export interface AssignEnterprisePlanProps {
  pricingPlanId: number;
  provider: PaymentProviderCodeVO | null;
  stripeIds: StripeIdsVO;
  period: { start: Date; end: Date };
  actorUUID: string;
}

export interface ResetToFreeProps {
  reason: ResetToFreeReasonVO;
  actorUUID: string;
}

const TIER_RANK_FREE = 0;
const TIER_RANK_STARTER = 1;
const TIER_RANK_GROWTH = 2;
const TIER_RANK_ENTERPRISE = 3;

function tierRank(tier: TierVO): number {
  if (tier.isFree()) return TIER_RANK_FREE;
  if (tier.isStarter()) return TIER_RANK_STARTER;
  if (tier.isGrowth()) return TIER_RANK_GROWTH;
  return TIER_RANK_ENTERPRISE;
}

/**
 * Aggregate root for a tenant's billing subscription. Single instance per
 * tenant (enforced by the UNIQUE constraint on `tenant_uuid` at the schema
 * level). Operates over `SubscriptionModel` via the immutable snapshot
 * pattern: every state change replaces `_model` with `_model.with({...})`
 * and emits the corresponding domain event.
 *
 * Public API is grouped by trigger:
 *
 *   Self-service (user, via HTTP handlers):
 *     - createFree         · initial FREE subscription at tenant onboarding
 *     - upgrade            · STARTER/GROWTH purchase, transitions to INCOMPLETE
 *                            awaiting Stripe Checkout confirmation
 *     - downgrade          · spawns TierChangeAggregate in COLD_DOWN
 *     - cancel             · marks intent to terminate at period end
 *     - reactivate         · undoes a pending cancel
 *     - revertPendingDowngrade · undoes a pending downgrade in cold-down
 *
 *   Stripe webhooks (provider events):
 *     - commitUpgrade            · customer.subscription.created confirms
 *     - renew                    · invoice.paid extends current period
 *     - registerFailedPayment    · invoice.payment_failed
 *     - enterDunningGrace        · retries exhausted
 *     - recoverFromDunningGrace  · payment recovered during grace
 *
 *   Cron / system:
 *     - applyPendingDowngrade  · cold-down expired, apply target plan
 *     - (executeDunningDowngrade — deferred; needs forDunning + schema
 *        migration for nullable to_pricing_plan_id, lands in Paso 9)
 *
 *   Admin:
 *     - assignEnterprisePlan   · sales-led ENTERPRISE provisioning
 *     - resetToFree            · cleanup after cancellation/contract end
 *
 * Invariants (validated on each mutation):
 *   - The resulting (provider, stripeIds) shape must form a valid
 *     BillingMode (MANUAL / STRIPE_INVOICING / STRIPE_SUBSCRIPTION); any
 *     other combination throws InvalidBillingModeForTierException.
 *   - Tier × BillingMode matrix validation (e.g. STARTER cannot be in
 *     MANUAL mode) is performed by the handler before calling the
 *     aggregate, since the aggregate has no access to PricingPlan repo
 *     to resolve a tier from a pricingPlanId.
 */
export class SubscriptionAggregate extends AggregateRoot {
  private _model: SubscriptionModel;

  private constructor(model: SubscriptionModel) {
    super();
    this._model = model;
  }

  // ── Factories ─────────────────────────────────────────────────────────

  static createFree(props: CreateFreeProps): SubscriptionAggregate {
    const model = SubscriptionModel.create({
      uuid: props.uuid,
      tenantUUID: props.tenantUUID,
    });
    return new SubscriptionAggregate(model);
  }

  static reconstitute(model: SubscriptionModel): SubscriptionAggregate {
    return new SubscriptionAggregate(model);
  }

  // ── Self-service (user) ───────────────────────────────────────────────

  upgrade(props: UpgradeProps): Result<void, DomainException> {
    if (props.targetTier.isEnterprise()) {
      return err(new EnterprisePurchaseNotSupportedException());
    }
    if (props.currentTier.equals(props.targetTier)) {
      return err(new SameTierChangeException(props.targetTier.toString()));
    }
    if (tierRank(props.targetTier) <= tierRank(props.currentTier)) {
      return err(
        new NotAnUpgradeException(props.currentTier.toString(), props.targetTier.toString()),
      );
    }
    if (this._model.status.isCancelled()) {
      return err(
        new SubscriptionNotActiveException(
          this._model.uuid.toString(),
          this._model.status.toString(),
        ),
      );
    }
    this._model = this._model.with({
      status: SubscriptionStatusVO.incomplete(),
    });
    this.apply(
      new UpgradeRequestedEvent(
        this._model.uuid.toString(),
        this._model.tenantUUID.toString(),
        props.currentTier.toString(),
        props.targetTier.toString(),
        props.targetPricingPlanId,
        props.actorUUID,
      ),
    );
    return ok(undefined);
  }

  downgrade(props: DowngradeProps): Result<TierChangeAggregate, DomainException> {
    if (props.currentTier.equals(props.targetTier)) {
      return err(new SameTierChangeException(props.targetTier.toString()));
    }
    if (tierRank(props.targetTier) >= tierRank(props.currentTier)) {
      return err(
        new NotADowngradeException(props.currentTier.toString(), props.targetTier.toString()),
      );
    }
    if (!this._model.status.isActive()) {
      return err(
        new SubscriptionNotActiveException(
          this._model.uuid.toString(),
          this._model.status.toString(),
        ),
      );
    }
    const subscriptionId = this.requireId();
    const tierChange = TierChangeAggregate.forDowngrade({
      subscriptionId,
      fromPricingPlanId: this._model.pricingPlanId,
      toPricingPlanId: props.targetPricingPlanId,
      source: TierChangeSourceVO.userRequest(),
      coldDownEndsAt: props.coldDownEndsAt,
    });
    this.apply(
      new DowngradeRequestedEvent(
        this._model.uuid.toString(),
        this._model.tenantUUID.toString(),
        props.currentTier.toString(),
        props.targetTier.toString(),
        tierChange.uuid,
        props.coldDownEndsAt,
        props.actorUUID,
      ),
    );
    return ok(tierChange);
  }

  cancel(props: CancelProps): Result<void, DomainException> {
    if (this._model.status.isCancelled() || this._model.status.isIncomplete()) {
      return err(
        new SubscriptionNotActiveException(
          this._model.uuid.toString(),
          this._model.status.toString(),
        ),
      );
    }
    if (this._model.cancelAtPeriodEnd) {
      return err(
        new SubscriptionNotActiveException(this._model.uuid.toString(), 'already-pending-cancel'),
      );
    }
    this._model = this._model.with({
      cancelAtPeriodEnd: props.atPeriodEnd,
    });
    this.apply(
      new SubscriptionCancelRequestedEvent(
        this._model.uuid.toString(),
        this._model.tenantUUID.toString(),
        props.atPeriodEnd,
        props.effectiveAt,
        props.actorUUID,
      ),
    );
    return ok(undefined);
  }

  reactivate(actorUUID: string): Result<void, DomainException> {
    if (!this._model.cancelAtPeriodEnd) {
      return err(new CannotReactivateException(this._model.uuid.toString()));
    }
    this._model = this._model.with({
      cancelAtPeriodEnd: false,
    });
    this.apply(
      new SubscriptionReactivatedEvent(
        this._model.uuid.toString(),
        this._model.tenantUUID.toString(),
        actorUUID,
      ),
    );
    return ok(undefined);
  }

  revertPendingDowngrade(
    props: RevertPendingDowngradeProps,
  ): Result<TierChangeAggregate, DomainException> {
    const subscriptionId = this.requireId();
    if (props.tierChange.subscriptionId !== subscriptionId) {
      return err(new NoPendingDowngradeException(this._model.uuid.toString()));
    }
    const revertResult = props.tierChange.markReverted(props.reason);
    if (revertResult.isErr()) {
      return err(revertResult.error);
    }
    this.apply(
      new PendingDowngradeRevertedEvent(
        this._model.uuid.toString(),
        this._model.tenantUUID.toString(),
        props.tierChange.uuid,
        props.reason.getValue(),
        props.actorUUID,
      ),
    );
    return ok(props.tierChange);
  }

  // ── Stripe webhooks ───────────────────────────────────────────────────

  commitUpgrade(props: CommitUpgradeProps): Result<void, DomainException> {
    if (this._model.status.getValue() !== SubscriptionStatusEnum.INCOMPLETE) {
      return err(
        new UpgradeNotInProgressException(
          this._model.uuid.toString(),
          this._model.status.toString(),
        ),
      );
    }
    const nextProvider = PaymentProviderCodeVO.stripe();
    const shapeResult = this.assertValidShape(nextProvider, props.stripeIds);
    if (shapeResult.isErr()) return err(shapeResult.error);
    this._model = this._model.with({
      pricingPlanId: props.pricingPlanId,
      provider: nextProvider,
      stripeIds: props.stripeIds,
      status: SubscriptionStatusVO.active(),
      currentPeriodStart: props.period.start,
      currentPeriodEnd: props.period.end,
    });
    this.apply(
      new UpgradeCommittedEvent(
        this._model.uuid.toString(),
        this._model.tenantUUID.toString(),
        props.tier.toString(),
        props.pricingPlanId,
        {
          customerId: props.stripeIds.getCustomerId() ?? '',
          subscriptionId: props.stripeIds.getSubscriptionId() ?? '',
          priceId: props.stripeIds.getPriceId(),
        },
        props.period.start,
        props.period.end,
      ),
    );
    return ok(undefined);
  }

  renew(period: { start: Date; end: Date }): Result<void, DomainException> {
    this._model = this._model.with({
      currentPeriodStart: period.start,
      currentPeriodEnd: period.end,
    });
    this.apply(
      new SubscriptionRenewedEvent(
        this._model.uuid.toString(),
        this._model.tenantUUID.toString(),
        period.start,
        period.end,
      ),
    );
    return ok(undefined);
  }

  registerFailedPayment(
    attemptCount: number,
    nextRetryAt: Date | null = null,
  ): Result<void, DomainException> {
    this._model = this._model.with({
      status: SubscriptionStatusVO.pastDue(),
    });
    this.apply(
      new PaymentFailedEvent(
        this._model.uuid.toString(),
        this._model.tenantUUID.toString(),
        attemptCount,
        nextRetryAt,
      ),
    );
    return ok(undefined);
  }

  enterDunningGrace(graceEndsAt: Date): Result<void, DomainException> {
    if (!this._model.status.isPastDue()) {
      return err(
        new SubscriptionNotActiveException(
          this._model.uuid.toString(),
          this._model.status.toString(),
        ),
      );
    }
    this._model = this._model.with({
      status: SubscriptionStatusVO.grace(),
      gracePeriodEndsAt: graceEndsAt,
    });
    this.apply(
      new DunningGraceStartedEvent(
        this._model.uuid.toString(),
        this._model.tenantUUID.toString(),
        graceEndsAt,
      ),
    );
    return ok(undefined);
  }

  recoverFromDunningGrace(): Result<void, DomainException> {
    if (!this._model.status.isInGrace()) {
      return err(
        new SubscriptionNotActiveException(
          this._model.uuid.toString(),
          this._model.status.toString(),
        ),
      );
    }
    this._model = this._model.with({
      status: SubscriptionStatusVO.active(),
      gracePeriodEndsAt: null,
    });
    this.apply(
      new DunningGraceRecoveredEvent(
        this._model.uuid.toString(),
        this._model.tenantUUID.toString(),
      ),
    );
    return ok(undefined);
  }

  // ── Cron / system ─────────────────────────────────────────────────────

  applyPendingDowngrade(
    props: ApplyPendingDowngradeProps,
  ): Result<TierChangeAggregate, DomainException> {
    const subscriptionId = this.requireId();
    if (props.tierChange.subscriptionId !== subscriptionId) {
      return err(new NoPendingDowngradeException(this._model.uuid.toString()));
    }
    if (!props.tierChange.state.isPending()) {
      return err(new NoPendingDowngradeException(this._model.uuid.toString()));
    }
    const now = new Date();
    const effectiveResult = props.tierChange.markEffective(now);
    if (effectiveResult.isErr()) return err(effectiveResult.error);

    if (props.targetTier.isFree()) {
      this._model = this._model.with({
        pricingPlanId: null,
        provider: null,
        stripeIds: StripeIdsVO.empty(),
      });
    } else {
      this._model = this._model.with({
        pricingPlanId: props.tierChange.model.toPricingPlanId,
      });
    }
    this.apply(
      new DowngradeAppliedEvent(
        this._model.uuid.toString(),
        this._model.tenantUUID.toString(),
        props.targetTier.toString(),
        props.tierChange.uuid,
      ),
    );
    return ok(props.tierChange);
  }

  // ── Admin ─────────────────────────────────────────────────────────────

  assignEnterprisePlan(props: AssignEnterprisePlanProps): Result<void, DomainException> {
    const canAssign =
      (this._model.status.isActive() && this._model.isFree()) ||
      this._model.status.isCancelled() ||
      this._model.status.isIncomplete();
    if (!canAssign) {
      return err(
        new SubscriptionNotAssignableToEnterpriseException(
          this._model.uuid.toString(),
          `status=${this._model.status.toString()}, isFree=${this._model.isFree()}`,
        ),
      );
    }
    const shapeResult = this.assertValidShape(props.provider, props.stripeIds);
    if (shapeResult.isErr()) return err(shapeResult.error);
    const billingMode = this.deriveBillingMode(props.provider, props.stripeIds);
    this._model = this._model.with({
      pricingPlanId: props.pricingPlanId,
      provider: props.provider,
      stripeIds: props.stripeIds,
      status: SubscriptionStatusVO.active(),
      currentPeriodStart: props.period.start,
      currentPeriodEnd: props.period.end,
      cancelAtPeriodEnd: false,
      gracePeriodEndsAt: null,
    });
    this.apply(
      new EnterprisePlanAssignedEvent(
        this._model.uuid.toString(),
        this._model.tenantUUID.toString(),
        props.pricingPlanId,
        billingMode.getValue(),
        props.period.start,
        props.period.end,
        props.actorUUID,
      ),
    );
    return ok(undefined);
  }

  resetToFree(props: ResetToFreeProps): Result<void, DomainException> {
    const previousTier = this._model.isFree() ? 'FREE' : 'PAID';
    const previousBillingMode = this._model.isFree()
      ? BillingModeVO.manual().getValue()
      : this._model.billingMode.getValue();
    this._model = this._model.with({
      pricingPlanId: null,
      provider: null,
      stripeIds: StripeIdsVO.empty(),
      status: SubscriptionStatusVO.active(),
      cancelAtPeriodEnd: false,
      gracePeriodEndsAt: null,
      trialEndsAt: null,
      currentPeriodStart: null,
      currentPeriodEnd: null,
    });
    this.apply(
      new SubscriptionResetToFreeEvent(
        this._model.uuid.toString(),
        this._model.tenantUUID.toString(),
        previousTier,
        previousBillingMode,
        props.reason.getValue(),
        props.actorUUID,
      ),
    );
    if (props.reason.isCancellation()) {
      this.apply(
        new SubscriptionCancelledEvent(
          this._model.uuid.toString(),
          this._model.tenantUUID.toString(),
          previousTier,
          props.actorUUID,
        ),
      );
    }
    return ok(undefined);
  }

  // ── Internal helpers ──────────────────────────────────────────────────

  private requireId(): number {
    if (this._model.id === undefined) {
      throw new Error(
        `SubscriptionAggregate operates on persisted subscriptions only (uuid=${this._model.uuid.toString()})`,
      );
    }
    return this._model.id;
  }

  private deriveBillingMode(
    provider: PaymentProviderCodeVO | null,
    stripeIds: StripeIdsVO,
  ): BillingModeVO {
    const mode = BillingModeVO.fromSubscriptionState({
      providerCode: provider?.getValue() ?? null,
      customerId: stripeIds.getCustomerId(),
      subscriptionId: stripeIds.getSubscriptionId(),
    });
    if (mode === null) {
      throw new Error(
        `Invalid (provider, stripeIds) combination on subscription ${this._model.uuid.toString()}`,
      );
    }
    return mode;
  }

  private assertValidShape(
    provider: PaymentProviderCodeVO | null,
    stripeIds: StripeIdsVO,
  ): Result<void, DomainException> {
    const mode = BillingModeVO.fromSubscriptionState({
      providerCode: provider?.getValue() ?? null,
      customerId: stripeIds.getCustomerId(),
      subscriptionId: stripeIds.getSubscriptionId(),
    });
    if (mode === null) {
      return err(new InvalidBillingModeForTierException('UNKNOWN', 'INVALID_SHAPE'));
    }
    return ok(undefined);
  }

  // ── Queries / read access ─────────────────────────────────────────────

  get status(): SubscriptionStatusVO {
    return this._model.status;
  }

  get billingMode(): BillingModeVO {
    return this._model.billingMode;
  }

  get model(): SubscriptionModel {
    return this._model;
  }

  get uuid(): string {
    return this._model.uuid.toString();
  }

  get id(): number | undefined {
    return this._model.id;
  }

  get tenantUUID(): string {
    return this._model.tenantUUID.toString();
  }

  isFree(): boolean {
    return this._model.isFree();
  }

  isCancelled(): boolean {
    return this._model.isCancelled();
  }
}

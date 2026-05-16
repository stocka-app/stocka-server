import { AggregateRoot } from '@shared/domain/base/aggregate-root';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result, err, ok } from '@shared/domain/result';
import { InvalidTierChangeTransitionException } from '@billing/domain/exceptions/business/invalid-tier-change-transition.exception';
import { TierChangeNotRevertableException } from '@billing/domain/exceptions/business/tier-change-not-revertable.exception';
import { TierChangeArchiveGraceStartedEvent } from '@billing/domain/events/tier-change-archive-grace-started.event';
import { TierChangeAutoArchivedEvent } from '@billing/domain/events/tier-change-auto-archived.event';
import { TierChangeCreatedEvent } from '@billing/domain/events/tier-change-created.event';
import { TierChangeDeletedEvent } from '@billing/domain/events/tier-change-deleted.event';
import { TierChangeEffectiveEvent } from '@billing/domain/events/tier-change-effective.event';
import { TierChangePreDeletionNotifiedEvent } from '@billing/domain/events/tier-change-pre-deletion-notified.event';
import { TierChangeRevertedEvent } from '@billing/domain/events/tier-change-reverted.event';
import { TierChangeModel } from '@billing/domain/models/tier-change.model';
import { TierChangeDirectionVO } from '@billing/domain/value-objects/tier-change-direction.vo';
import { TierChangeRevertReasonVO } from '@billing/domain/value-objects/tier-change-revert-reason.vo';
import { TierChangeSourceVO } from '@billing/domain/value-objects/tier-change-source.vo';
import {
  TierChangeStateEnum,
  TierChangeStateVO,
} from '@billing/domain/value-objects/tier-change-state.vo';

export interface TierChangeForDowngradeProps {
  subscriptionId: number;
  fromPricingPlanId: number | null;
  toPricingPlanId: number;
  source: TierChangeSourceVO;
  coldDownEndsAt: Date;
}

/**
 * Aggregate root for the long-lived tracking record of a subscription
 * downgrade. Born in `COLD_DOWN` via `forDowngrade` (user-initiated) and
 * advances through the state machine driven by crons and webhook handlers:
 *
 *     COLD_DOWN ─► EFFECTIVE ─► GRACE ─► ARCHIVED ─► DELETED
 *        │             │           │         │
 *        └─────────────┴───────────┴─────────┴── REVERTED (any pre-DELETED)
 *
 * `markPreDeletionNotified` is mid-state (stays ARCHIVED) — it just records
 * that the day-60 warning email was sent.
 *
 * The `forDunning` factory (dunning-forced downgrade that bypasses
 * COLD_DOWN and starts in EFFECTIVE with `toPricingPlanId = null`) is
 * deferred until a follow-up migration relaxes
 * `subscription_changes.to_pricing_plan_id` to nullable — currently NOT
 * NULL in the schema, but FREE has no `pricing_plans` row to point at.
 * Tracked for Paso 9 (Dunning) where the migration lands alongside
 * `SubscriptionAggregate.executeDunningDowngrade()`.
 */
export class TierChangeAggregate extends AggregateRoot {
  private _model: TierChangeModel;

  private constructor(model: TierChangeModel) {
    super();
    this._model = model;
  }

  // ── Factories ─────────────────────────────────────────────────────────

  /**
   * Creates a TierChange for a user-initiated downgrade. State starts at
   * `COLD_DOWN`; `effectiveAt` carries the planned moment when the
   * downgrade will be applied (typically `currentPeriodEnd` of the
   * Stripe subscription).
   *
   * The repo query `findDowngradesReadyToApply(now)` selects rows where
   * `state = COLD_DOWN AND effectiveAt <= now` — that's why we record the
   * planned date at creation time, even though `markEffective(at)` will
   * later overwrite it with the actual transition timestamp.
   */
  static forDowngrade(props: TierChangeForDowngradeProps): TierChangeAggregate {
    const direction = TierChangeDirectionVO.downgrade();
    const model = TierChangeModel.create({
      subscriptionId: props.subscriptionId,
      fromPricingPlanId: props.fromPricingPlanId,
      toPricingPlanId: props.toPricingPlanId,
      direction,
      source: props.source,
      state: TierChangeStateVO.coldDown(),
      effectiveAt: props.coldDownEndsAt,
    });
    const aggregate = new TierChangeAggregate(model);
    aggregate.apply(
      new TierChangeCreatedEvent(
        model.uuid.toString(),
        model.subscriptionId,
        model.fromPricingPlanId,
        model.toPricingPlanId,
        direction.getValue(),
        props.source.getValue(),
        TierChangeStateEnum.COLD_DOWN,
      ),
    );
    return aggregate;
  }

  static reconstitute(model: TierChangeModel): TierChangeAggregate {
    return new TierChangeAggregate(model);
  }

  // ── State transitions (Tell-Don't-Ask) ────────────────────────────────

  markEffective(at: Date): Result<void, DomainException> {
    if (this._model.state.getValue() !== TierChangeStateEnum.COLD_DOWN) {
      return err(
        new InvalidTierChangeTransitionException(
          this._model.uuid.toString(),
          this._model.state.getValue(),
          TierChangeStateEnum.EFFECTIVE,
        ),
      );
    }
    this._model = this._model.with({
      state: TierChangeStateVO.effective(),
      effectiveAt: at,
    });
    this.apply(
      new TierChangeEffectiveEvent(this._model.uuid.toString(), this._model.subscriptionId, at),
    );
    return ok(undefined);
  }

  startArchiveGrace(endsAt: Date): Result<void, DomainException> {
    if (this._model.state.getValue() !== TierChangeStateEnum.EFFECTIVE) {
      return err(
        new InvalidTierChangeTransitionException(
          this._model.uuid.toString(),
          this._model.state.getValue(),
          TierChangeStateEnum.GRACE,
        ),
      );
    }
    this._model = this._model.with({
      state: TierChangeStateVO.grace(),
      gracePeriodEndsAt: endsAt,
    });
    this.apply(
      new TierChangeArchiveGraceStartedEvent(
        this._model.uuid.toString(),
        this._model.subscriptionId,
        endsAt,
      ),
    );
    return ok(undefined);
  }

  markArchived(snapshot: Record<string, unknown>): Result<void, DomainException> {
    if (this._model.state.getValue() !== TierChangeStateEnum.GRACE) {
      return err(
        new InvalidTierChangeTransitionException(
          this._model.uuid.toString(),
          this._model.state.getValue(),
          TierChangeStateEnum.ARCHIVED,
        ),
      );
    }
    this._model = this._model.with({
      state: TierChangeStateVO.archived(),
      autoArchivedAt: new Date(),
      archiveSnapshot: snapshot,
    });
    this.apply(
      new TierChangeAutoArchivedEvent(
        this._model.uuid.toString(),
        this._model.subscriptionId,
        snapshot,
      ),
    );
    return ok(undefined);
  }

  /**
   * Records the day-60 pre-deletion notification. Does NOT change state —
   * the TierChange stays in `ARCHIVED` until the day-90 deletion cron runs
   * `markDeleted`. Idempotent: re-calling when `preDeletionNoticeAt` is
   * already set returns `ok` without emitting a new event.
   */
  markPreDeletionNotified(scheduledDeleteAt: Date): Result<void, DomainException> {
    if (this._model.state.getValue() !== TierChangeStateEnum.ARCHIVED) {
      return err(
        new InvalidTierChangeTransitionException(
          this._model.uuid.toString(),
          this._model.state.getValue(),
          'PRE_DELETION_NOTIFICATION',
        ),
      );
    }
    if (this._model.preDeletionNoticeAt !== null) {
      return ok(undefined);
    }
    this._model = this._model.with({
      preDeletionNoticeAt: new Date(),
    });
    this.apply(
      new TierChangePreDeletionNotifiedEvent(
        this._model.uuid.toString(),
        this._model.subscriptionId,
        scheduledDeleteAt,
      ),
    );
    return ok(undefined);
  }

  markDeleted(deletedSnapshot: Record<string, unknown>): Result<void, DomainException> {
    if (this._model.state.getValue() !== TierChangeStateEnum.ARCHIVED) {
      return err(
        new InvalidTierChangeTransitionException(
          this._model.uuid.toString(),
          this._model.state.getValue(),
          TierChangeStateEnum.DELETED,
        ),
      );
    }
    this._model = this._model.with({
      state: TierChangeStateVO.deleted(),
      deletedAt: new Date(),
    });
    this.apply(
      new TierChangeDeletedEvent(
        this._model.uuid.toString(),
        this._model.subscriptionId,
        deletedSnapshot,
      ),
    );
    return ok(undefined);
  }

  markReverted(reason: TierChangeRevertReasonVO): Result<void, DomainException> {
    if (!this._model.state.isRevertable()) {
      return err(
        new TierChangeNotRevertableException(
          this._model.uuid.toString(),
          this._model.state.getValue(),
        ),
      );
    }
    const previousState = this._model.state.getValue();
    this._model = this._model.with({
      state: TierChangeStateVO.reverted(),
      revertedAt: new Date(),
      revertReason: reason,
    });
    this.apply(
      new TierChangeRevertedEvent(
        this._model.uuid.toString(),
        this._model.subscriptionId,
        previousState,
        reason.getValue(),
      ),
    );
    return ok(undefined);
  }

  // ── Queries / read access ─────────────────────────────────────────────

  get state(): TierChangeStateVO {
    return this._model.state;
  }

  get direction(): TierChangeDirectionVO {
    return this._model.direction;
  }

  get source(): TierChangeSourceVO {
    return this._model.source;
  }

  /** Read-only snapshot for mappers and view assemblers. */
  get model(): TierChangeModel {
    return this._model;
  }

  get uuid(): string {
    return this._model.uuid.toString();
  }

  get id(): number | undefined {
    return this._model.id;
  }

  get subscriptionId(): number {
    return this._model.subscriptionId;
  }

  isRevertable(): boolean {
    return this._model.state.isRevertable();
  }

  isFinal(): boolean {
    return this._model.state.isFinal();
  }

  isPending(): boolean {
    return this._model.state.isPending();
  }
}

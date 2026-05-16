import { v7 as uuidV7 } from 'uuid';
import { BaseModel } from '@shared/domain/base/base.model';
import { UUIDVO } from '@shared/domain/value-objects/compound/uuid.vo';
import { MoneyVO } from '@billing/domain/value-objects/money.vo';
import { TierChangeDirectionVO } from '@billing/domain/value-objects/tier-change-direction.vo';
import { TierChangeRevertReasonVO } from '@billing/domain/value-objects/tier-change-revert-reason.vo';
import { TierChangeSourceVO } from '@billing/domain/value-objects/tier-change-source.vo';
import { TierChangeStateVO } from '@billing/domain/value-objects/tier-change-state.vo';

export interface TierChangeModelCreateProps {
  subscriptionId: number;
  fromPricingPlanId: number | null;
  toPricingPlanId: number;
  direction: TierChangeDirectionVO;
  source: TierChangeSourceVO;
  state: TierChangeStateVO;
  effectiveAt?: Date | null;
}

export interface TierChangeModelReconstituteProps {
  id: number;
  uuid: UUIDVO;
  subscriptionId: number;
  fromPricingPlanId: number | null;
  toPricingPlanId: number;
  direction: TierChangeDirectionVO;
  source: TierChangeSourceVO;
  state: TierChangeStateVO;
  requestedAt: Date;
  effectiveAt: Date | null;
  gracePeriodEndsAt: Date | null;
  autoArchivedAt: Date | null;
  preDeletionNoticeAt: Date | null;
  deletedAt: Date | null;
  revertedAt: Date | null;
  revertReason: TierChangeRevertReasonVO | null;
  proratedAmount: MoneyVO | null;
  archiveSnapshot: Record<string, unknown> | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TierChangeModelChanges {
  state?: TierChangeStateVO;
  effectiveAt?: Date | null;
  gracePeriodEndsAt?: Date | null;
  autoArchivedAt?: Date | null;
  preDeletionNoticeAt?: Date | null;
  deletedAt?: Date | null;
  revertedAt?: Date | null;
  revertReason?: TierChangeRevertReasonVO | null;
  proratedAmount?: MoneyVO | null;
  archiveSnapshot?: Record<string, unknown> | null;
  archivedAt?: Date | null;
  updatedAt?: Date;
}

/**
 * Pure data carrier for a TierChange — the long-lived tracking record for a
 * subscription downgrade lifecycle. Born in `COLD_DOWN` (user-initiated
 * downgrade) or `EFFECTIVE` (dunning-forced, bypasses cold-down). Transitions
 * through GRACE → ARCHIVED → DELETED on the 15/60/90-day timeline, or pivots
 * to REVERTED at any pre-DELETED state.
 *
 * Identity, FK references, direction, and source are fixed at construction;
 * only the lifecycle timestamps and `state` mutate via `with()` during the
 * lifecycle.
 */
export class TierChangeModel extends BaseModel {
  constructor(
    public readonly uuid: UUIDVO,
    public readonly subscriptionId: number,
    public readonly fromPricingPlanId: number | null,
    public readonly toPricingPlanId: number,
    public readonly direction: TierChangeDirectionVO,
    public readonly source: TierChangeSourceVO,
    public readonly state: TierChangeStateVO,
    public readonly requestedAt: Date,
    public readonly effectiveAt: Date | null,
    public readonly gracePeriodEndsAt: Date | null,
    public readonly autoArchivedAt: Date | null,
    public readonly preDeletionNoticeAt: Date | null,
    public readonly deletedAt: Date | null,
    public readonly revertedAt: Date | null,
    public readonly revertReason: TierChangeRevertReasonVO | null,
    public readonly proratedAmount: MoneyVO | null,
    public readonly archiveSnapshot: Record<string, unknown> | null,
    public readonly archivedAt: Date | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly id?: number,
  ) {
    super();
  }

  static create(props: TierChangeModelCreateProps): TierChangeModel {
    const now = new Date();
    return new TierChangeModel(
      new UUIDVO(uuidV7()),
      props.subscriptionId,
      props.fromPricingPlanId,
      props.toPricingPlanId,
      props.direction,
      props.source,
      props.state,
      now,
      props.effectiveAt ?? null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      now,
      now,
    );
  }

  static reconstitute(props: TierChangeModelReconstituteProps): TierChangeModel {
    return new TierChangeModel(
      props.uuid,
      props.subscriptionId,
      props.fromPricingPlanId,
      props.toPricingPlanId,
      props.direction,
      props.source,
      props.state,
      props.requestedAt,
      props.effectiveAt,
      props.gracePeriodEndsAt,
      props.autoArchivedAt,
      props.preDeletionNoticeAt,
      props.deletedAt,
      props.revertedAt,
      props.revertReason,
      props.proratedAmount,
      props.archiveSnapshot,
      props.archivedAt,
      props.createdAt,
      props.updatedAt,
      props.id,
    );
  }

  with(changes: TierChangeModelChanges): TierChangeModel {
    return new TierChangeModel(
      this.uuid,
      this.subscriptionId,
      this.fromPricingPlanId,
      this.toPricingPlanId,
      this.direction,
      this.source,
      changes.state ?? this.state,
      this.requestedAt,
      changes.effectiveAt !== undefined ? changes.effectiveAt : this.effectiveAt,
      changes.gracePeriodEndsAt !== undefined ? changes.gracePeriodEndsAt : this.gracePeriodEndsAt,
      changes.autoArchivedAt !== undefined ? changes.autoArchivedAt : this.autoArchivedAt,
      changes.preDeletionNoticeAt !== undefined
        ? changes.preDeletionNoticeAt
        : this.preDeletionNoticeAt,
      changes.deletedAt !== undefined ? changes.deletedAt : this.deletedAt,
      changes.revertedAt !== undefined ? changes.revertedAt : this.revertedAt,
      changes.revertReason !== undefined ? changes.revertReason : this.revertReason,
      changes.proratedAmount !== undefined ? changes.proratedAmount : this.proratedAmount,
      changes.archiveSnapshot !== undefined ? changes.archiveSnapshot : this.archiveSnapshot,
      changes.archivedAt !== undefined ? changes.archivedAt : this.archivedAt,
      this.createdAt,
      changes.updatedAt ?? new Date(),
      this.id,
    );
  }

  // ── Pure derived queries (no mutation) ────────────────────────────────

  isPending(): boolean {
    return this.state.isPending();
  }

  isEffective(): boolean {
    return this.state.isEffective();
  }

  isInArchiveGrace(): boolean {
    return this.state.isInGrace() && this.gracePeriodEndsAt !== null;
  }

  isFinal(): boolean {
    return this.state.isFinal();
  }

  isRevertable(): boolean {
    return this.state.isRevertable();
  }

  isReverted(): boolean {
    return this.state.isReverted();
  }
}

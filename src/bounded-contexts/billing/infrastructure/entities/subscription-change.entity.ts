import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@shared/infrastructure/base/base.entity';
import { SubscriptionEntity } from '@billing/infrastructure/entities/subscription.entity';
import { PricingPlanEntity } from '@billing/infrastructure/entities/pricing-plan.entity';

@Entity({ name: 'subscription_changes', schema: 'billing' })
@Index('idx_sub_changes_state_effective', ['state', 'effectiveAt'])
@Index('idx_sub_changes_state_grace', ['state', 'gracePeriodEndsAt'])
export class SubscriptionChangeEntity extends BaseEntity {
  @Column({ name: 'subscription_id', type: 'int' })
  @Index('idx_sub_changes_subscription')
  subscriptionId!: number;

  @Column({ name: 'from_pricing_plan_id', type: 'int', nullable: true })
  fromPricingPlanId!: number | null;

  @Column({ name: 'to_pricing_plan_id', type: 'int' })
  toPricingPlanId!: number;

  @Column({ name: 'change_type', type: 'varchar', length: 20 })
  changeType!: string;

  @Column({ type: 'varchar', length: 20 })
  source!: string;

  @Column({ type: 'varchar', length: 20 })
  state!: string;

  @Column({ name: 'requested_at', type: 'timestamptz' })
  requestedAt!: Date;

  @Column({ name: 'effective_at', type: 'timestamptz', nullable: true })
  effectiveAt!: Date | null;

  @Column({ name: 'grace_period_ends_at', type: 'timestamptz', nullable: true })
  gracePeriodEndsAt!: Date | null;

  @Column({ name: 'auto_archived_at', type: 'timestamptz', nullable: true })
  autoArchivedAt!: Date | null;

  @Column({ name: 'pre_deletion_notice_at', type: 'timestamptz', nullable: true })
  preDeletionNoticeAt!: Date | null;

  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;

  @Column({ name: 'reverted_at', type: 'timestamptz', nullable: true })
  revertedAt!: Date | null;

  @Column({ name: 'revert_reason', type: 'varchar', length: 100, nullable: true })
  revertReason!: string | null;

  @Column({ name: 'prorated_amount', type: 'decimal', precision: 10, scale: 2, nullable: true })
  proratedAmount!: string | null;

  @Column({ name: 'archive_snapshot', type: 'jsonb', nullable: true })
  archiveSnapshot!: Record<string, unknown> | null;

  @ManyToOne(() => SubscriptionEntity, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'subscription_id' })
  subscription!: SubscriptionEntity;

  @ManyToOne(() => PricingPlanEntity, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'from_pricing_plan_id' })
  fromPricingPlan!: PricingPlanEntity | null;

  @ManyToOne(() => PricingPlanEntity, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'to_pricing_plan_id' })
  toPricingPlan!: PricingPlanEntity;
}

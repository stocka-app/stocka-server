import { Entity, Column, Index, Unique } from 'typeorm';
import { BaseEntity } from '@shared/infrastructure/base/base.entity';

@Entity({ name: 'pricing_plans', schema: 'billing' })
@Index(['tier', 'billingCycle', 'currency', 'isActive'])
@Unique(['tier', 'billingCycle', 'currency', 'effectiveFrom'])
export class PricingPlanEntity extends BaseEntity {
  @Column({ type: 'varchar', length: 20 })
  tier!: string;

  @Column({ name: 'billing_cycle', type: 'varchar', length: 20 })
  billingCycle!: string;

  @Column({ type: 'char', length: 3 })
  currency!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount!: string;

  @Column({ name: 'trial_days', type: 'int', default: 0 })
  trialDays!: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'effective_from', type: 'timestamptz' })
  effectiveFrom!: Date;

  @Column({ name: 'effective_until', type: 'timestamptz', nullable: true })
  effectiveUntil!: Date | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;
}

import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@shared/infrastructure/base/base.entity';
import { PricingPlanEntity } from '@billing/infrastructure/entities/pricing-plan.entity';
import { PaymentProviderEntity } from '@billing/infrastructure/entities/payment-provider.entity';

@Entity({ name: 'subscriptions', schema: 'billing' })
@Index('idx_subscriptions_external_customer', ['providerCode', 'externalCustomerId'])
@Index('idx_subscriptions_external_sub', ['providerCode', 'externalSubscriptionId'])
@Index('idx_subscriptions_status_grace', ['status', 'gracePeriodEndsAt'])
export class SubscriptionEntity extends BaseEntity {
  @Column({ name: 'tenant_uuid', type: 'uuid', unique: true })
  @Index('idx_subscriptions_tenant')
  tenantUUID!: string;

  @Column({ name: 'pricing_plan_id', type: 'int', nullable: true })
  pricingPlanId!: number | null;

  @Column({ name: 'provider_code', type: 'varchar', length: 20, nullable: true })
  providerCode!: string | null;

  @Column({ name: 'external_customer_id', type: 'varchar', length: 100, nullable: true })
  externalCustomerId!: string | null;

  @Column({ name: 'external_subscription_id', type: 'varchar', length: 100, nullable: true })
  externalSubscriptionId!: string | null;

  @Column({ type: 'varchar', length: 30 })
  status!: string;

  @Column({ name: 'current_period_start', type: 'timestamptz', nullable: true })
  currentPeriodStart!: Date | null;

  @Column({ name: 'current_period_end', type: 'timestamptz', nullable: true })
  currentPeriodEnd!: Date | null;

  @Column({ name: 'cancel_at_period_end', type: 'boolean', default: false })
  cancelAtPeriodEnd!: boolean;

  @Column({ name: 'trial_ends_at', type: 'timestamptz', nullable: true })
  trialEndsAt!: Date | null;

  @Column({ name: 'grace_period_ends_at', type: 'timestamptz', nullable: true })
  gracePeriodEndsAt!: Date | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  @ManyToOne(() => PricingPlanEntity, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'pricing_plan_id' })
  pricingPlan!: PricingPlanEntity | null;

  @ManyToOne(() => PaymentProviderEntity, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'provider_code' })
  provider!: PaymentProviderEntity | null;
}

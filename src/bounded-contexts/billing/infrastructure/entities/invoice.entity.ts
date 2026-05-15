import { Entity, Column, Index, Unique, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@shared/infrastructure/base/base.entity';
import { SubscriptionEntity } from '@billing/infrastructure/entities/subscription.entity';
import { PaymentProviderEntity } from '@billing/infrastructure/entities/payment-provider.entity';

@Entity({ name: 'invoices', schema: 'billing' })
@Unique('uq_invoice_external', ['providerCode', 'externalInvoiceId'])
export class InvoiceEntity extends BaseEntity {
  @Column({ name: 'subscription_id', type: 'int' })
  @Index('idx_invoices_subscription')
  subscriptionId!: number;

  @Column({ name: 'tenant_uuid', type: 'uuid' })
  @Index('idx_invoices_tenant')
  tenantUUID!: string;

  @Column({ name: 'provider_code', type: 'varchar', length: 20 })
  providerCode!: string;

  @Column({ name: 'external_invoice_id', type: 'varchar', length: 100 })
  externalInvoiceId!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount!: string;

  @Column({ type: 'char', length: 3 })
  currency!: string;

  @Column({ type: 'varchar', length: 20 })
  status!: string;

  @Column({ name: 'period_start', type: 'timestamptz' })
  periodStart!: Date;

  @Column({ name: 'period_end', type: 'timestamptz' })
  periodEnd!: Date;

  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true })
  paidAt!: Date | null;

  @Column({ name: 'attempt_count', type: 'int', default: 0 })
  attemptCount!: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  @ManyToOne(() => SubscriptionEntity, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'subscription_id' })
  subscription!: SubscriptionEntity;

  @ManyToOne(() => PaymentProviderEntity, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'provider_code' })
  provider!: PaymentProviderEntity;
}

import { Entity, Column, Index, Unique, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@shared/infrastructure/base/base.entity';
import { PricingPlanEntity } from '@billing/infrastructure/entities/pricing-plan.entity';
import { PaymentProviderEntity } from '@billing/infrastructure/entities/payment-provider.entity';

@Entity({ name: 'provider_price_mappings', schema: 'billing' })
@Unique('uq_mapping_external_price', ['providerCode', 'externalPriceId'])
@Index(['pricingPlanId', 'providerCode', 'isActive'])
export class ProviderPriceMappingEntity extends BaseEntity {
  @Column({ name: 'pricing_plan_id', type: 'int' })
  pricingPlanId!: number;

  @Column({ name: 'provider_code', type: 'varchar', length: 20 })
  providerCode!: string;

  @Column({ name: 'external_product_id', type: 'varchar', length: 100 })
  externalProductId!: string;

  @Column({ name: 'external_price_id', type: 'varchar', length: 100 })
  externalPriceId!: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @ManyToOne(() => PricingPlanEntity, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'pricing_plan_id' })
  pricingPlan!: PricingPlanEntity;

  @ManyToOne(() => PaymentProviderEntity, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'provider_code' })
  provider!: PaymentProviderEntity;
}

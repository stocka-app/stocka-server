import { Entity, Column, ManyToOne, JoinColumn, PrimaryColumn } from 'typeorm';
import { TierPlanEntity } from '@tenant/infrastructure/entities/tier-plan.entity';
import { CatalogActionEntity } from '@tenant/infrastructure/entities/catalog-action.entity';

@Entity({ name: 'tier_action_overrides', schema: 'tenants' })
export class TierActionOverrideEntity {
  @PrimaryColumn({ type: 'varchar', length: 20 })
  tier!: string;

  @PrimaryColumn({ name: 'action_id', type: 'int' })
  actionId!: number;

  @Column({ type: 'boolean' })
  enabled!: boolean;

  @Column({ type: 'jsonb', nullable: true })
  config!: Record<string, unknown> | null;

  @ManyToOne(() => TierPlanEntity)
  @JoinColumn({ name: 'tier', referencedColumnName: 'tier' })
  tierPlan!: TierPlanEntity;

  @ManyToOne(() => CatalogActionEntity)
  @JoinColumn({ name: 'action_id' })
  action!: CatalogActionEntity;
}

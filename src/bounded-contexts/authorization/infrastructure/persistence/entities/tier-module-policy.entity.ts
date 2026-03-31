import { Entity, Column, ManyToOne, JoinColumn, PrimaryColumn } from 'typeorm';
import { TierPlanEntity } from '@tenant/infrastructure/entities/tier-plan.entity';
import { ModuleEntity } from '@authorization/infrastructure/persistence/entities/module.entity';

@Entity({ name: 'tier_module_policies', schema: 'tiers' })
export class TierModulePolicyEntity {
  @PrimaryColumn({ type: 'varchar', length: 20 })
  tier!: string;

  @PrimaryColumn({ name: 'module_id', type: 'int' })
  moduleId!: number;

  @Column({ type: 'boolean', default: true })
  enabled!: boolean;

  @Column({ type: 'jsonb', nullable: true })
  config!: Record<string, unknown> | null;

  @ManyToOne(() => TierPlanEntity)
  @JoinColumn({ name: 'tier', referencedColumnName: 'tier' })
  tierPlan!: TierPlanEntity;

  @ManyToOne(() => ModuleEntity)
  @JoinColumn({ name: 'module_id' })
  module!: ModuleEntity;
}

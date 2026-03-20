import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'tier_plans', schema: 'tiers' })
export class TierPlanEntity {
  @PrimaryColumn({ type: 'varchar', length: 20 })
  tier!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ name: 'max_products', type: 'int', nullable: true })
  maxProducts!: number | null;

  @Column({ name: 'max_users', type: 'int', nullable: true })
  maxUsers!: number | null;

  @Column({ name: 'max_warehouses', type: 'int', nullable: true, default: 0 })
  maxWarehouses!: number | null;

  @Column({ name: 'policy_version', type: 'timestamptz' })
  policyVersion!: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

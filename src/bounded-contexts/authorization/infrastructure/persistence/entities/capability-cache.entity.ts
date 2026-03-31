import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity({ name: 'capability_cache', schema: 'authz' })
export class CapabilityCacheEntity {
  @PrimaryColumn({ name: 'tenant_id', type: 'int' })
  tenantId!: number;

  @Column({ type: 'jsonb', nullable: true, default: null })
  capabilities!: Record<string, unknown> | null;

  @Column({ name: 'capabilities_built_at', type: 'timestamptz', nullable: true, default: null })
  capabilitiesBuiltAt!: Date | null;
}

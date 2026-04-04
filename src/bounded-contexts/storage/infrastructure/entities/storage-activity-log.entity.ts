import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '@shared/infrastructure/base/base.entity';

@Entity({ name: 'storage_activity_log', schema: 'storage' })
@Index('idx_activity_log_storage_uuid', ['storageUUID'])
@Index('idx_activity_log_tenant_uuid', ['tenantUUID'])
@Index('idx_activity_log_storage_occurred', ['storageUUID', 'occurredAt'])
export class StorageActivityLogEntity extends BaseEntity {
  @Column({ name: 'storage_uuid', type: 'uuid' })
  storageUUID!: string;

  @Column({ name: 'tenant_uuid', type: 'uuid' })
  tenantUUID!: string;

  @Column({ name: 'actor_uuid', type: 'uuid' })
  actorUUID!: string;

  @Column({ type: 'varchar', length: 30 })
  action!: string;

  @Column({ name: 'previous_value', type: 'jsonb', nullable: true, default: null })
  previousValue!: Record<string, unknown> | null;

  @Column({ name: 'new_value', type: 'jsonb', nullable: true, default: null })
  newValue!: Record<string, unknown> | null;

  @Column({ name: 'occurred_at', type: 'timestamptz', default: () => 'NOW()' })
  occurredAt!: Date;
}

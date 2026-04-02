import { Entity, PrimaryGeneratedColumn, Column, Index, BeforeInsert } from 'typeorm';
import { v7 as uuidV7 } from 'uuid';

@Entity({ name: 'storage_activity_log', schema: 'storage' })
@Index('idx_activity_log_storage_uuid', ['storageUUID'])
@Index('idx_activity_log_tenant_uuid', ['tenantUUID'])
@Index('idx_activity_log_storage_occurred', ['storageUUID', 'occurredAt'])
export class StorageActivityLogEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'uuid', unique: true })
  uuid!: string;

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

  @BeforeInsert()
  generateUUID(): void {
    if (!this.uuid) {
      this.uuid = uuidV7();
    }
  }
}

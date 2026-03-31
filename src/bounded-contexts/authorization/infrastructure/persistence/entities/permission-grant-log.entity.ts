import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'permission_grant_log', schema: 'authz' })
export class PermissionGrantLogEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'tenant_id', type: 'int' })
  tenantId!: number;

  @Column({ name: 'user_id', type: 'int' })
  userId!: number;

  @Column({ name: 'action_key', type: 'varchar', length: 100 })
  actionKey!: string;

  @Column({ name: 'event_type', type: 'varchar', length: 20 })
  eventType!: string;

  @Column({ name: 'performed_by', type: 'int' })
  performedBy!: number;

  @Column({ name: 'occurred_at', type: 'timestamptz', default: () => 'NOW()' })
  occurredAt!: Date;
}

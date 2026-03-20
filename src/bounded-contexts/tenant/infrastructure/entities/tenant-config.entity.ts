import { Entity, Column } from 'typeorm';
import { BaseEntity } from '@shared/infrastructure/base/base.entity';

@Entity({ name: 'tenant_config', schema: 'tenants' })
export class TenantConfigEntity extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'int', unique: true })
  tenantId!: number;

  @Column({ type: 'varchar', length: 20, default: 'FREE' })
  tier!: string;

  @Column({ name: 'max_warehouses', type: 'int', default: 0 })
  maxWarehouses!: number;

  @Column({ name: 'max_custom_rooms', type: 'int', default: 1 })
  maxCustomRooms!: number;

  @Column({ name: 'max_store_rooms', type: 'int', default: 1 })
  maxStoreRooms!: number;

  @Column({ name: 'max_users', type: 'int', default: 1 })
  maxUsers!: number;

  @Column({ name: 'max_products', type: 'int', default: 100 })
  maxProducts!: number;

  @Column({ name: 'notifications_enabled', type: 'boolean', default: true })
  notificationsEnabled!: boolean;

  @Column({ name: 'product_count', type: 'int', default: 0 })
  productCount!: number;

  @Column({ name: 'storage_count', type: 'int', default: 0 })
  storageCount!: number;

  @Column({ name: 'member_count', type: 'int', default: 1 })
  memberCount!: number;

  @Column({ type: 'jsonb', nullable: true, default: null })
  capabilities!: Record<string, unknown> | null;

  @Column({ name: 'capabilities_built_at', type: 'timestamptz', nullable: true, default: null })
  capabilitiesBuiltAt!: Date | null;
}

import { Entity, Column } from 'typeorm';
import { BaseEntity } from '@shared/infrastructure/base/base.entity';

@Entity('tenant_config')
export class TenantConfigEntity extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'int', unique: true })
  tenantId!: number;

  @Column({ type: 'varchar', length: 20, default: 'FREE' })
  tier!: string;

  @Column({ name: 'max_warehouses', type: 'int', default: 0 })
  maxWarehouses!: number;

  @Column({ name: 'max_users', type: 'int', default: 1 })
  maxUsers!: number;

  @Column({ name: 'max_products', type: 'int', default: 100 })
  maxProducts!: number;

  @Column({ name: 'notifications_enabled', type: 'boolean', default: true })
  notificationsEnabled!: boolean;
}

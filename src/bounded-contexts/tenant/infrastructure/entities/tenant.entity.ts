import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '@shared/infrastructure/base/base.entity';

@Entity('tenants')
export class TenantEntity extends BaseEntity {
  @Column({ type: 'varchar', length: 150 })
  name!: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  @Index()
  slug!: string;

  @Column({ name: 'business_type', type: 'varchar', length: 50 })
  businessType!: string;

  @Column({ type: 'char', length: 2, default: 'MX' })
  country!: string;

  @Column({ type: 'varchar', length: 60, default: 'America/Mexico_City' })
  timezone!: string;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  @Index()
  status!: string;

  @Column({ name: 'owner_user_id', type: 'int' })
  ownerUserId!: number;
}

import { Entity, Column } from 'typeorm';
import { BaseEntity } from '@shared/infrastructure/base/base.entity';

@Entity('tenant_profiles')
export class TenantProfileEntity extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'int', unique: true })
  tenantId!: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  giro!: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  phone!: string | null;

  @Column({ name: 'contact_email', type: 'varchar', length: 255, nullable: true })
  contactEmail!: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  website!: string | null;

  @Column({ name: 'address_line1', type: 'varchar', length: 200, nullable: true })
  addressLine1!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  state!: string | null;

  @Column({ name: 'postal_code', type: 'varchar', length: 20, nullable: true })
  postalCode!: string | null;

  @Column({ name: 'logo_url', type: 'varchar', length: 500, nullable: true })
  logoUrl!: string | null;
}

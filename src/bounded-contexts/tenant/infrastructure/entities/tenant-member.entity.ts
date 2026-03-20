import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '@shared/infrastructure/base/base.entity';

@Entity({ name: 'tenant_members', schema: 'tenants' })
export class TenantMemberEntity extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'int' })
  @Index()
  tenantId!: number;

  @Column({ name: 'user_id', type: 'int' })
  userId!: number;

  @Column({ name: 'user_uuid', type: 'uuid' })
  userUUID!: string;

  @Column({ type: 'varchar', length: 30 })
  role!: string;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  @Index()
  status!: string;

  @Column({ name: 'invited_by', type: 'int', nullable: true })
  invitedBy!: number | null;

  @Column({ name: 'joined_at', type: 'timestamptz', nullable: true })
  joinedAt!: Date | null;
}

import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'user_permission_grants', schema: 'authz' })
export class UserPermissionGrantEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'tenant_id', type: 'int' })
  tenantId!: number;

  @Column({ name: 'user_id', type: 'int' })
  userId!: number;

  @Column({ name: 'action_key', type: 'varchar', length: 100 })
  actionKey!: string;

  @Column({ name: 'granted_by', type: 'int' })
  grantedBy!: number;

  @Column({ name: 'granted_at', type: 'timestamptz', default: () => 'NOW()' })
  grantedAt!: Date;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt!: Date | null;
}

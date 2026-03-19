import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('tenant_invitations')
export class TenantInvitationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'int' })
  tenantId!: number;

  @Column({ name: 'tenant_uuid', type: 'uuid' })
  tenantUUID!: string;

  @Column({ name: 'tenant_name', type: 'varchar', length: 150 })
  tenantName!: string;

  @Column({ name: 'invited_by', type: 'int' })
  invitedBy!: number;

  @Column({ type: 'varchar', length: 255 })
  email!: string;

  @Column({ type: 'varchar', length: 30 })
  role!: string;

  @Column({ type: 'varchar', length: 128, unique: true })
  @Index()
  token!: string;

  @Column({ name: 'accepted_at', type: 'timestamptz', nullable: true })
  acceptedAt!: Date | null;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}

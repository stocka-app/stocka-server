import { Entity, Column, PrimaryColumn, CreateDateColumn, BeforeInsert, Index } from 'typeorm';
import { v7 as uuidV7 } from 'uuid';

@Entity({ name: 'tenant_invitations', schema: 'tenants' })
export class TenantInvitationEntity {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id!: string;

  @BeforeInsert()
  generateId(): void {
    if (!this.id) {
      this.id = uuidV7();
    }
  }

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

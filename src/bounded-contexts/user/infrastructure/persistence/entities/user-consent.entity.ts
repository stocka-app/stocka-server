import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity({ name: 'user_consents', schema: 'identity' })
@Index('idx_user_consents_user_uuid', ['userUUID'])
@Index('idx_user_consents_lookup', ['userUUID', 'consentType', 'createdAt'])
export class UserConsentEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_uuid', type: 'varchar', length: 36 })
  userUUID!: string;

  @Column({ name: 'consent_type', type: 'varchar', length: 30 })
  consentType!: string;

  @Column({ type: 'boolean' })
  granted!: boolean;

  @Column({ name: 'document_version', type: 'varchar', length: 20, default: 'v1.0' })
  documentVersion!: string;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress!: string | null;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}

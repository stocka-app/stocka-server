import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@shared/infrastructure/base/base.entity';
import { CredentialAccountEntity } from '@user/account/infrastructure/entities/credential-account.entity';

@Entity({ name: 'email_verification_tokens', schema: 'auth' })
export class EmailVerificationTokenEntity extends BaseEntity {
  @Column({ name: 'credential_account_id', type: 'int' })
  @Index()
  credentialAccountId!: number;

  @Column({ name: 'code_hash', type: 'varchar', length: 128 })
  codeHash!: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ name: 'used_at', type: 'timestamptz', nullable: true })
  usedAt!: Date | null;

  @Column({ name: 'resend_count', type: 'int', default: 0 })
  resendCount!: number;

  @Column({ name: 'last_resent_at', type: 'timestamptz', nullable: true })
  lastResentAt!: Date | null;

  @ManyToOne(() => CredentialAccountEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'credential_account_id' })
  credentialAccount!: CredentialAccountEntity;
}

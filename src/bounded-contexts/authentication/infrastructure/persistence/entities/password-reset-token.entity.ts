import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@shared/infrastructure/base/base.entity';
import { CredentialAccountEntity } from '@user/account/infrastructure/entities/credential-account.entity';

@Entity({ name: 'password_reset_tokens', schema: 'authn' })
export class PasswordResetTokenEntity extends BaseEntity {
  @Column({ name: 'credential_account_id', type: 'int' })
  credentialAccountId!: number;

  @Column({ name: 'token_hash', type: 'varchar', length: 128 })
  @Index()
  tokenHash!: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ name: 'used_at', type: 'timestamptz', nullable: true })
  usedAt!: Date | null;

  @ManyToOne(() => CredentialAccountEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'credential_account_id' })
  credentialAccount!: CredentialAccountEntity;
}

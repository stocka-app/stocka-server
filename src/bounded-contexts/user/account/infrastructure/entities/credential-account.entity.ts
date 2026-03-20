import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '@shared/infrastructure/base/base.entity';
import { AccountEntity } from '@user/account/infrastructure/entities/account.entity';

@Entity({ name: 'credential_accounts', schema: 'accounts' })
export class CredentialAccountEntity extends BaseEntity {
  @Column({ name: 'account_id', type: 'int', unique: true })
  accountId!: number;

  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255, nullable: true })
  passwordHash!: string | null;

  @Column({ type: 'varchar', length: 30, default: 'pending_verification' })
  @Index()
  status!: string;

  @Column({ name: 'email_verified_at', type: 'timestamptz', nullable: true })
  emailVerifiedAt!: Date | null;

  @Column({ name: 'verification_blocked_until', type: 'timestamptz', nullable: true })
  verificationBlockedUntil!: Date | null;

  @Column({ name: 'created_with', type: 'varchar', length: 20, default: 'email' })
  @Index()
  createdWith!: string;

  @ManyToOne(() => AccountEntity, (account) => account.credentialAccount, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id' })
  account!: AccountEntity;
}

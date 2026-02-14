import { Entity, Column, OneToMany, Index } from 'typeorm';
import { BaseEntity } from '@shared/infrastructure/base/base.entity';
import { SocialAccountEntity } from '@user/infrastructure/persistence/entities/social-account.entity';

@Entity('users')
export class UserEntity extends BaseEntity {
  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  @Column({ type: 'varchar', length: 30, unique: true })
  username!: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255, nullable: true })
  passwordHash!: string | null;

  @Column({ type: 'varchar', length: 30, default: 'pending_verification' })
  @Index()
  status!: string;

  @Column({ name: 'email_verified_at', type: 'timestamptz', nullable: true })
  emailVerifiedAt!: Date | null;

  @Column({ name: 'verification_blocked_until', type: 'timestamptz', nullable: true })
  verificationBlockedUntil!: Date | null;

  @OneToMany(() => SocialAccountEntity, (socialAccount) => socialAccount.user)
  socialAccounts!: SocialAccountEntity[];
}

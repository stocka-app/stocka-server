import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '@/shared/infrastructure/base/base.entity';

@Entity('verification_attempts')
export class VerificationAttemptEntity extends BaseEntity {
  @Column({ name: 'user_uuid', type: 'varchar', length: 36 })
  @Index()
  userUuid!: string;

  @Column({ type: 'varchar', length: 255 })
  @Index()
  email!: string;

  @Column({ name: 'ip_address', type: 'inet' })
  @Index()
  ipAddress!: string;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent!: string | null;

  @Column({ name: 'code_entered', type: 'varchar', length: 10 })
  codeEntered!: string;

  @Column({ type: 'boolean', default: false })
  success!: boolean;

  @Column({ name: 'verification_type', type: 'varchar', length: 30, default: 'email_verification' })
  verificationType!: string;

  @Column({ name: 'attempted_at', type: 'timestamptz', default: () => 'NOW()' })
  @Index()
  attemptedAt!: Date;
}

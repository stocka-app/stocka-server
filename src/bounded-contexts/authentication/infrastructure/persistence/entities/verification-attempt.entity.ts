import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '@shared/infrastructure/base/base.entity';

@Entity('verification_attempts')
export class VerificationAttemptEntity extends BaseEntity {
  @Column({ name: 'user_uuid', type: 'varchar', length: 36, nullable: true })
  @Index()
  userUUID!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @Index()
  email!: string | null;

  @Column({ name: 'ip_address', type: 'inet' })
  @Index()
  ipAddress!: string;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent!: string | null;

  @Column({ name: 'code_entered', type: 'varchar', length: 10, nullable: true })
  codeEntered!: string | null;

  @Column({ type: 'boolean', default: false })
  success!: boolean;

  @Column({ name: 'verification_type', type: 'varchar', length: 30, default: 'email_verification' })
  verificationType!: string;

  @Column({ name: 'attempted_at', type: 'timestamptz', default: () => 'NOW()' })
  @Index()
  attemptedAt!: Date;
}

import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@/shared/infrastructure/base/base.entity';
import { UserEntity } from '@/user/infrastructure/persistence/entities/user.entity';

@Entity('email_verification_tokens')
export class EmailVerificationTokenEntity extends BaseEntity {
  @Column({ name: 'user_id', type: 'int' })
  @Index()
  userId!: number;

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

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;
}

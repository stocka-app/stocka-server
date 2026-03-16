import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@shared/infrastructure/base/base.entity';
import { SessionEntity } from '@user/account/session/infrastructure/entities/session.entity';
import { SocialAccountEntity } from '@user/account/infrastructure/entities/social-account.entity';

@Entity('social_sessions')
export class SocialSessionEntity extends BaseEntity {
  @Column({ name: 'session_id', type: 'int', unique: true })
  sessionId!: number;

  @Column({ name: 'social_account_id', type: 'int' })
  socialAccountId!: number;

  @Column({ type: 'varchar', length: 20 })
  provider!: string;

  @ManyToOne(() => SessionEntity, (session) => session.socialSession, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session!: SessionEntity;

  @ManyToOne(() => SocialAccountEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'social_account_id' })
  socialAccount!: SocialAccountEntity;
}

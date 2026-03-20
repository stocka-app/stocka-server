import { Entity, Column, ManyToOne, JoinColumn, OneToOne } from 'typeorm';
import { BaseEntity } from '@shared/infrastructure/base/base.entity';
import { AccountEntity } from '@user/account/infrastructure/entities/account.entity';
import { CredentialSessionEntity } from '@user/account/session/infrastructure/entities/credential-session.entity';
import { SocialSessionEntity } from '@user/account/session/infrastructure/entities/social-session.entity';

@Entity({ name: 'sessions', schema: 'sessions' })
export class SessionEntity extends BaseEntity {
  @Column({ name: 'account_id', type: 'int' })
  accountId!: number;

  @Column({ name: 'token_hash', type: 'varchar', length: 128, unique: true })
  tokenHash!: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @ManyToOne(() => AccountEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id' })
  account!: AccountEntity;

  @OneToOne(() => CredentialSessionEntity, (cs) => cs.session)
  credentialSession!: CredentialSessionEntity | null;

  @OneToOne(() => SocialSessionEntity, (ss) => ss.session)
  socialSession!: SocialSessionEntity | null;
}

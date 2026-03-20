import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@shared/infrastructure/base/base.entity';
import { SessionEntity } from '@user/account/session/infrastructure/entities/session.entity';
import { CredentialAccountEntity } from '@user/account/infrastructure/entities/credential-account.entity';

@Entity({ name: 'credential_sessions', schema: 'identity' })
export class CredentialSessionEntity extends BaseEntity {
  @Column({ name: 'session_id', type: 'int', unique: true })
  sessionId!: number;

  @Column({ name: 'credential_account_id', type: 'int' })
  credentialAccountId!: number;

  @ManyToOne(() => SessionEntity, (session) => session.credentialSession, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session!: SessionEntity;

  @ManyToOne(() => CredentialAccountEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'credential_account_id' })
  credentialAccount!: CredentialAccountEntity;
}

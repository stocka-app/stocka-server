import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '@shared/infrastructure/base/base.entity';
import { AccountEntity } from '@user/account/infrastructure/entities/account.entity';

@Entity({ name: 'social_accounts', schema: 'identity' })
@Index(['provider', 'providerId'], { unique: true })
@Index(['accountId', 'provider'], { unique: true })
export class SocialAccountEntity extends BaseEntity {
  @Column({ name: 'account_id', type: 'int' })
  accountId!: number;

  @Column({ type: 'varchar', length: 20 })
  provider!: string;

  @Column({ name: 'provider_id', type: 'varchar', length: 255 })
  providerId!: string;

  @Column({ name: 'provider_email', type: 'varchar', length: 255, nullable: true })
  providerEmail!: string | null;

  @Column({ name: 'linked_at', type: 'timestamptz', default: () => 'now()' })
  linkedAt!: Date;

  @ManyToOne(() => AccountEntity, (account) => account.socialAccounts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id' })
  account!: AccountEntity;
}

import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '@/shared/infrastructure/base/base.entity';
import { UserEntity } from '@/user/infrastructure/persistence/entities/user.entity';

@Entity('social_accounts')
@Index(['provider', 'providerId'], { unique: true })
export class SocialAccountEntity extends BaseEntity {
  @Column({ name: 'user_id', type: 'int' })
  userId!: number;

  @Column({ type: 'varchar', length: 20 })
  provider!: string;

  @Column({ name: 'provider_id', type: 'varchar', length: 255 })
  providerId!: string;

  @ManyToOne(() => UserEntity, (user) => user.socialAccounts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;
}

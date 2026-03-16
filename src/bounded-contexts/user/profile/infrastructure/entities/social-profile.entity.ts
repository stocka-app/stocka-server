import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '@shared/infrastructure/base/base.entity';
import { ProfileEntity } from '@user/profile/infrastructure/entities/profile.entity';

@Entity('social_profiles')
@Index(['profileId', 'provider'], { unique: true })
export class SocialProfileEntity extends BaseEntity {
  @Column({ name: 'profile_id', type: 'int' })
  profileId!: number;

  @Column({ name: 'social_account_uuid', type: 'uuid' })
  socialAccountUUID!: string;

  @Column({ type: 'varchar', length: 20 })
  provider!: string;

  @Column({ name: 'provider_display_name', type: 'varchar', length: 150, nullable: true })
  providerDisplayName!: string | null;

  @Column({ name: 'provider_avatar_url', type: 'varchar', length: 500, nullable: true })
  providerAvatarUrl!: string | null;

  @Column({ name: 'provider_profile_url', type: 'varchar', length: 500, nullable: true })
  providerProfileUrl!: string | null;

  @Column({ name: 'synced_at', type: 'timestamptz', default: () => 'now()' })
  syncedAt!: Date;

  @ManyToOne(() => ProfileEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'profile_id' })
  profile!: ProfileEntity;
}

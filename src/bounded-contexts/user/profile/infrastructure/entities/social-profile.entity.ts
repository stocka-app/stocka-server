import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '@shared/infrastructure/base/base.entity';
import { ProfileEntity } from '@user/profile/infrastructure/entities/profile.entity';

@Entity({ name: 'social_profiles', schema: 'profiles' })
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

  @Column({ name: 'given_name', type: 'varchar', length: 100, nullable: true })
  givenName!: string | null;

  @Column({ name: 'family_name', type: 'varchar', length: 100, nullable: true })
  familyName!: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  locale!: string | null;

  @Column({ name: 'email_verified', type: 'boolean', nullable: true })
  emailVerified!: boolean | null;

  @Column({ name: 'job_title', type: 'varchar', length: 200, nullable: true })
  jobTitle!: string | null;

  @Column({ name: 'raw_data', type: 'jsonb', nullable: true })
  rawData!: Record<string, unknown> | null;

  @Column({ name: 'synced_at', type: 'timestamptz', default: () => 'now()' })
  syncedAt!: Date;

  @ManyToOne(() => ProfileEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'profile_id' })
  profile!: ProfileEntity;
}

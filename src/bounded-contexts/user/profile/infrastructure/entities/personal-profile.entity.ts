import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@shared/infrastructure/base/base.entity';
import { ProfileEntity } from '@user/profile/infrastructure/entities/profile.entity';

@Entity({ name: 'personal_profiles', schema: 'identity' })
export class PersonalProfileEntity extends BaseEntity {
  @Column({ name: 'profile_id', type: 'int', unique: true })
  profileId!: number;

  @Column({ type: 'varchar', length: 30, unique: true })
  username!: string;

  @Column({ name: 'display_name', type: 'varchar', length: 100, nullable: true })
  displayName!: string | null;

  @Column({ name: 'avatar_url', type: 'varchar', length: 500, nullable: true })
  avatarUrl!: string | null;

  @Column({ type: 'varchar', length: 10, default: 'es' })
  locale!: string;

  @Column({ type: 'varchar', length: 60, default: 'America/Mexico_City' })
  timezone!: string;

  @ManyToOne(() => ProfileEntity, (profile) => profile.personalProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'profile_id' })
  profile!: ProfileEntity;
}

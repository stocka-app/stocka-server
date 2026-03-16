import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@shared/infrastructure/base/base.entity';
import { ProfileEntity } from '@user/profile/infrastructure/entities/profile.entity';

@Entity('commercial_profiles')
export class CommercialProfileEntity extends BaseEntity {
  @Column({ name: 'profile_id', type: 'int', unique: true })
  profileId!: number;

  @Column({ name: 'full_name', type: 'varchar', length: 150, nullable: true })
  fullName!: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  phone!: string | null;

  @Column({ name: 'country_code', type: 'char', length: 2, nullable: true, default: 'MX' })
  countryCode!: string | null;

  @Column({ name: 'tax_id', type: 'varchar', length: 50, nullable: true })
  taxId!: string | null;

  @ManyToOne(() => ProfileEntity, (profile) => profile.commercialProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'profile_id' })
  profile!: ProfileEntity;
}

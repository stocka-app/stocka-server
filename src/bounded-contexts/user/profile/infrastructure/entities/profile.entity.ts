import { Entity, Column, OneToOne } from 'typeorm';
import { BaseEntity } from '@shared/infrastructure/base/base.entity';
import { PersonalProfileEntity } from '@user/profile/infrastructure/entities/personal-profile.entity';

@Entity({ name: 'profiles', schema: 'profiles' })
export class ProfileEntity extends BaseEntity {
  @Column({ name: 'user_id', type: 'int', unique: true })
  userId!: number;

  @OneToOne(() => PersonalProfileEntity, (personal) => personal.profile)
  personalProfile!: PersonalProfileEntity | null;
}

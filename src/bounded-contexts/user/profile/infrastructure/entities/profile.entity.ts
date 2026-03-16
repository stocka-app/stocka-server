import { Entity, Column, OneToOne } from 'typeorm';
import { BaseEntity } from '@shared/infrastructure/base/base.entity';
import { PersonalProfileEntity } from '@user/profile/infrastructure/entities/personal-profile.entity';
import { CommercialProfileEntity } from '@user/profile/infrastructure/entities/commercial-profile.entity';

@Entity('profiles')
export class ProfileEntity extends BaseEntity {
  @Column({ name: 'user_id', type: 'int', unique: true })
  userId!: number;

  @OneToOne(() => PersonalProfileEntity, (personal) => personal.profile)
  personalProfile!: PersonalProfileEntity | null;

  @OneToOne(() => CommercialProfileEntity, (commercial) => commercial.profile)
  commercialProfile!: CommercialProfileEntity | null;
}

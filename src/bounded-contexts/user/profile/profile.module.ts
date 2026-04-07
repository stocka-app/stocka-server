import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ProfileEntity } from '@user/profile/infrastructure/entities/profile.entity';
import { PersonalProfileEntity } from '@user/profile/infrastructure/entities/personal-profile.entity';
import { SocialProfileEntity } from '@user/profile/infrastructure/entities/social-profile.entity';
import { TypeOrmProfileRepository } from '@user/profile/infrastructure/repositories/typeorm-profile.repository';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

@Module({
  imports: [TypeOrmModule.forFeature([ProfileEntity, PersonalProfileEntity, SocialProfileEntity])],
  providers: [
    { provide: INJECTION_TOKENS.PROFILE_CONTRACT, useClass: TypeOrmProfileRepository },
    TypeOrmProfileRepository,
  ],
  exports: [INJECTION_TOKENS.PROFILE_CONTRACT, TypeOrmProfileRepository],
})
export class ProfileModule {}

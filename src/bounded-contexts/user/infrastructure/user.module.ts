import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';

import { UserEntity } from '@user/infrastructure/persistence/entities/user.entity';
import { TypeOrmUserRepository } from '@user/infrastructure/persistence/repositories/typeorm-user.repository';
import { GetMeController } from '@user/infrastructure/controllers/get-me/get-me.controller';
import { UserFacade } from '@user/infrastructure/facade/user.facade';
import { AuthenticationModule } from '@authentication/infrastructure/authentication.module';
import { AccountModule } from '@user/account/account.module';
import { ProfileModule } from '@user/profile/profile.module';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity]),
    CqrsModule,
    forwardRef(() => AuthenticationModule),
    AccountModule,
    ProfileModule,
  ],
  controllers: [GetMeController],
  providers: [
    {
      provide: INJECTION_TOKENS.USER_CONTRACT,
      useClass: TypeOrmUserRepository,
    },
    {
      provide: INJECTION_TOKENS.USER_FACADE,
      useExisting: UserFacade,
    },
    TypeOrmUserRepository,
    UserFacade,
  ],
  exports: [INJECTION_TOKENS.USER_FACADE, UserFacade],
})
export class UserModule {}

import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';

import { UserEntity } from '@/user/infrastructure/persistence/entities/user.entity';
import { SocialAccountEntity } from '@/user/infrastructure/persistence/entities/social-account.entity';
import { TypeOrmUserRepository } from '@/user/infrastructure/persistence/repositories/typeorm-user.repository';
import { CreateUserHandler } from '@/user/application/commands/create-user/create-user.handler';
import { CreateUserFromSocialHandler } from '@/user/application/commands/create-user-from-social/create-user-from-social.handler';
import { FindUserByUuidHandler } from '@/user/application/queries/find-user-by-uuid/find-user-by-uuid.handler';
import { FindUserByEmailHandler } from '@/user/application/queries/find-user-by-email/find-user-by-email.handler';
import { FindUserByEmailOrUsernameHandler } from '@/user/application/queries/find-user-by-email-or-username/find-user-by-email-or-username.handler';
import {
  UserCreatedEventHandler,
  UserCreatedFromSocialEventHandler,
  UserPasswordUpdatedEventHandler,
} from '@/user/application/event-handlers';
import { GetMeController } from '@/user/infrastructure/controllers/get-me/get-me.controller';
import { UserFacade } from '@/user/infrastructure/facade/user.facade';
import { AuthModule } from '@/auth/infrastructure/auth.module';
import { INJECTION_TOKENS } from '@/common/constants/app.constants';

const CommandHandlers = [CreateUserHandler, CreateUserFromSocialHandler];
const QueryHandlers = [
  FindUserByUuidHandler,
  FindUserByEmailHandler,
  FindUserByEmailOrUsernameHandler,
];
const EventHandlers = [
  UserCreatedEventHandler,
  UserCreatedFromSocialEventHandler,
  UserPasswordUpdatedEventHandler,
];

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, SocialAccountEntity]),
    CqrsModule,
    forwardRef(() => AuthModule),
  ],
  controllers: [GetMeController],
  providers: [
    {
      provide: INJECTION_TOKENS.USER_CONTRACT,
      useClass: TypeOrmUserRepository,
    },
    ...CommandHandlers,
    ...QueryHandlers,
    ...EventHandlers,
    UserFacade,
  ],
  exports: [
    {
      provide: INJECTION_TOKENS.USER_FACADE,
      useExisting: UserFacade,
    },
    UserFacade,
  ],
})
export class UserModule {}

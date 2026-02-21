import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';

import { UserEntity } from '@user/infrastructure/persistence/entities/user.entity';
import { SocialAccountEntity } from '@user/infrastructure/persistence/entities/social-account.entity';
import { TypeOrmUserRepository } from '@user/infrastructure/persistence/repositories/typeorm-user.repository';
import { TypeOrmSocialAccountRepository } from '@user/infrastructure/persistence/repositories/typeorm-social-account.repository';
import { CreateUserHandler } from '@user/application/commands/create-user/create-user.handler';
import { CreateUserFromSocialHandler } from '@user/application/commands/create-user-from-social/create-user-from-social.handler';
import { LinkProviderToUserHandler } from '@user/application/commands/link-provider-to-user/link-provider-to-user.handler';
import { SetPasswordForSocialUserHandler } from '@user/application/commands/set-password-for-social-user/set-password-for-social-user.handler';
import { FindUserByUUIDHandler } from '@user/application/queries/find-user-by-uuid/find-user-by-uuid.handler';
import { FindUserByEmailHandler } from '@user/application/queries/find-user-by-email/find-user-by-email.handler';
import { FindUserByEmailOrUsernameHandler } from '@user/application/queries/find-user-by-email-or-username/find-user-by-email-or-username.handler';
import { UserCreatedEventHandler } from '@user/application/event-handlers/user-created.event-handler';
import { UserCreatedFromSocialEventHandler } from '@user/application/event-handlers/user-created-from-social.event-handler';
import { UserPasswordUpdatedEventHandler } from '@user/application/event-handlers/user-password-updated.event-handler';
import { GetMeController } from '@user/infrastructure/controllers/get-me/get-me.controller';
import { UserFacade } from '@user/infrastructure/facade/user.facade';
import { AuthModule } from '@auth/infrastructure/auth.module';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

const CommandHandlers = [
  CreateUserHandler,
  CreateUserFromSocialHandler,
  LinkProviderToUserHandler,
  SetPasswordForSocialUserHandler,
];
const QueryHandlers = [
  FindUserByUUIDHandler,
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
    {
      provide: INJECTION_TOKENS.SOCIAL_ACCOUNT_CONTRACT,
      useClass: TypeOrmSocialAccountRepository,
    },
    {
      provide: INJECTION_TOKENS.USER_FACADE,
      useExisting: UserFacade,
    },
    ...CommandHandlers,
    ...QueryHandlers,
    ...EventHandlers,
    UserFacade,
  ],
  exports: [INJECTION_TOKENS.USER_FACADE, UserFacade],
})
export class UserModule {}

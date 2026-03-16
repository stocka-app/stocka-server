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
import { SessionModule } from '@user/account/session/session.module';
import { MediatorModule } from '@shared/infrastructure/mediator/mediator.module';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { UserCreatedEventHandler } from '@user/application/event-handlers/user-created.event-handler';
import { UserCreatedFromSocialEventHandler } from '@user/application/event-handlers/user-created-from-social.event-handler';
import { UserPasswordUpdatedEventHandler } from '@user/application/event-handlers/user-password-updated.event-handler';
import { UpdatePasswordOnResetHandler } from '@user/application/event-handlers/update-password-on-reset.handler';
import { BlockVerificationOnRateLimitHandler } from '@user/application/event-handlers/block-verification-on-rate-limit.handler';
import { VerifyUserEmailOnVerificationCompletedHandler } from '@user/application/event-handlers/verify-user-email-on-verification-completed.handler';

const EventHandlers = [
  UserCreatedEventHandler,
  UserCreatedFromSocialEventHandler,
  UserPasswordUpdatedEventHandler,
  UpdatePasswordOnResetHandler,
  BlockVerificationOnRateLimitHandler,
  VerifyUserEmailOnVerificationCompletedHandler,
];

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity]),
    CqrsModule,
    forwardRef(() => AuthenticationModule),
    AccountModule,
    ProfileModule,
    SessionModule,
    MediatorModule,
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
    ...EventHandlers,
  ],
  exports: [INJECTION_TOKENS.USER_FACADE, UserFacade],
})
export class UserModule {}

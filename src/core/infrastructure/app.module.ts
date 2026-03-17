import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { CqrsModule } from '@nestjs/cqrs';
import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';

import { validate } from '@core/config/environment/env.validation';
import databaseConfig from '@core/config/database/database.config';
import { typeOrmAsyncConfig } from '@core/config/database/typeorm.config';
import { UserModule } from '@user/infrastructure/user.module';
import { AuthenticationModule } from '@authentication/infrastructure/authentication.module';
import { TenantModule } from '@tenant/tenant.module';
import { MediatorModule } from '@shared/infrastructure/mediator/mediator.module';
import { EmailModule } from '@shared/infrastructure/email/email.module';
import { UnitOfWorkModule } from '@shared/infrastructure/database/unit-of-work.module';
import { RateLimitGuard } from '@common/guards/rate-limit.guard';
import { RateLimitInterceptor } from '@common/interceptors/rate-limit.interceptor';
import { AppController } from '@core/infrastructure/app.controller';
import { HealthModule } from '@core/infrastructure/health/health.module';
import { DomainExceptionFilter } from '@common/filters/domain-exception.filter';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig],
      validate,
    }),
    TypeOrmModule.forRootAsync(typeOrmAsyncConfig),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 3,
      },
      {
        name: 'medium',
        ttl: 60000,
        limit: 100,
      },
    ]),
    CqrsModule.forRoot(),
    HealthModule,
    EmailModule,
    UnitOfWorkModule,
    UserModule,
    AuthenticationModule,
    TenantModule,
    MediatorModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: RateLimitInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: DomainExceptionFilter,
    },
  ],
})
export class AppModule {}

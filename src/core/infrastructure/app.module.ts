import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { validate } from '@/core/config/environment/env.validation';
import databaseConfig from '@/core/config/database/database.config';
import { typeOrmAsyncConfig } from '@/core/config/database/typeorm.config';
import { UserModule } from '@/bounded-contexts/user/infrastructure/user.module';
import { AuthModule } from '@/bounded-contexts/auth/infrastructure/auth.module';
import { MediatorModule } from '@/shared/infrastructure/mediator/mediator.module';
import { EmailModule } from '@/shared/infrastructure/email/email.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig],
      validate,
    }),
    TypeOrmModule.forRootAsync(typeOrmAsyncConfig),
    EmailModule,
    UserModule,
    AuthModule,
    MediatorModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}

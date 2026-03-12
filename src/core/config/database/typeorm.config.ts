import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleAsyncOptions } from '@nestjs/typeorm';
import { UserEntity } from '@user/infrastructure/persistence/entities/user.entity';
import { SocialAccountEntity } from '@user/infrastructure/persistence/entities/social-account.entity';
import { SessionEntity } from '@authentication/infrastructure/persistence/entities/session.entity';
import { PasswordResetTokenEntity } from '@authentication/infrastructure/persistence/entities/password-reset-token.entity';
import { EmailVerificationTokenEntity } from '@authentication/infrastructure/persistence/entities/email-verification-token.entity';
import { VerificationAttemptEntity } from '@authentication/infrastructure/persistence/entities/verification-attempt.entity';
import { ProcessStateEntity } from '@shared/infrastructure/persistence/entities/process-state.entity';

export const typeOrmAsyncConfig: TypeOrmModuleAsyncOptions = {
  useFactory: (configService: ConfigService) => ({
    type: 'postgres',
    host: configService.get<string>('database.host'),
    port: configService.get<number>('database.port'),
    username: configService.get<string>('database.username'),
    password: configService.get<string>('database.password'),
    database: configService.get<string>('database.database'),
    entities: [
      UserEntity,
      SocialAccountEntity,
      SessionEntity,
      PasswordResetTokenEntity,
      EmailVerificationTokenEntity,
      VerificationAttemptEntity,
      ProcessStateEntity,
    ],
    // Migrations are run manually via CLI, not auto-loaded in app
    migrationsRun: false,
    // Schema changes must go through migrations — never auto-sync
    synchronize: false,
    logging: configService.get<string>('NODE_ENV') === 'development',
  }),
  inject: [ConfigService],
};

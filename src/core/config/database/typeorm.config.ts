import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleAsyncOptions } from '@nestjs/typeorm';
import { UserEntity } from '@user/infrastructure/persistence/entities/user.entity';
import { ProfileEntity } from '@user/profile/infrastructure/entities/profile.entity';
import { PersonalProfileEntity } from '@user/profile/infrastructure/entities/personal-profile.entity';
import { SocialProfileEntity } from '@user/profile/infrastructure/entities/social-profile.entity';
import { AccountEntity } from '@user/account/infrastructure/entities/account.entity';
import { CredentialAccountEntity } from '@user/account/infrastructure/entities/credential-account.entity';
import { SocialAccountEntity } from '@user/account/infrastructure/entities/social-account.entity';
import { SessionEntity } from '@user/account/session/infrastructure/entities/session.entity';
import { CredentialSessionEntity } from '@user/account/session/infrastructure/entities/credential-session.entity';
import { SocialSessionEntity } from '@user/account/session/infrastructure/entities/social-session.entity';
import { PasswordResetTokenEntity } from '@authentication/infrastructure/persistence/entities/password-reset-token.entity';
import { EmailVerificationTokenEntity } from '@authentication/infrastructure/persistence/entities/email-verification-token.entity';
import { VerificationAttemptEntity } from '@authentication/infrastructure/persistence/entities/verification-attempt.entity';
import { ProcessStateEntity } from '@shared/infrastructure/persistence/entities/process-state.entity';
import { TenantEntity } from '@tenant/infrastructure/entities/tenant.entity';
import { TenantMemberEntity } from '@tenant/infrastructure/entities/tenant-member.entity';
import { TenantProfileEntity } from '@tenant/infrastructure/entities/tenant-profile.entity';
import { TenantConfigEntity } from '@tenant/infrastructure/entities/tenant-config.entity';
import { UserConsentEntity } from '@user/infrastructure/persistence/entities/user-consent.entity';
import { OnboardingSessionEntity } from '@onboarding/infrastructure/entities/onboarding-session.entity';
import { TenantInvitationEntity } from '@onboarding/infrastructure/entities/tenant-invitation.entity';
import { StorageEntity } from '@storage/infrastructure/entities/storage.entity';
import { WarehouseEntity } from '@storage/infrastructure/entities/warehouse.entity';
import { StoreRoomEntity } from '@storage/infrastructure/entities/store-room.entity';
import { CustomRoomEntity } from '@storage/infrastructure/entities/custom-room.entity';
import { StorageActivityLogEntity } from '@storage/infrastructure/entities/storage-activity-log.entity';

export const typeOrmAsyncConfig: TypeOrmModuleAsyncOptions = {
  useFactory: (configService: ConfigService) => ({
    type: 'postgres',
    host: configService.get<string>('database.host'),
    port: configService.get<number>('database.port'),
    username: configService.get<string>('database.username'),
    password: configService.get<string>('database.password'),
    database: configService.get<string>('database.database'),
    entities: [
      // User BC — anchor
      UserEntity,
      // User BC — Consent audit trail
      UserConsentEntity,
      // User BC — Profile sub-aggregate
      ProfileEntity,
      PersonalProfileEntity,
      SocialProfileEntity,
      // User BC — Account sub-aggregate
      AccountEntity,
      CredentialAccountEntity,
      SocialAccountEntity,
      // User BC — Session sub-aggregate
      SessionEntity,
      CredentialSessionEntity,
      SocialSessionEntity,
      // Auth BC — token and audit entities
      PasswordResetTokenEntity,
      EmailVerificationTokenEntity,
      VerificationAttemptEntity,
      // Shared — saga process state
      ProcessStateEntity,
      // Tenant BC
      TenantEntity,
      TenantMemberEntity,
      TenantProfileEntity,
      TenantConfigEntity,
      // Onboarding BC
      OnboardingSessionEntity,
      TenantInvitationEntity,
      // Storage BC
      StorageEntity,
      WarehouseEntity,
      StoreRoomEntity,
      CustomRoomEntity,
      StorageActivityLogEntity,
    ],
    // Migrations are run manually via CLI, not auto-loaded in app
    migrationsRun: false,
    // Schema changes must go through migrations — never auto-sync
    synchronize: false,
    logging: configService.get<string>('NODE_ENV') === 'development',
  }),
  inject: [ConfigService],
};

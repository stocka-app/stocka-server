/**
 * Storage-scoped NestJS application singleton for Storage BC e2e tests.
 *
 * Includes StorageModule + TenantModule to exercise the full storage
 * lifecycle (create, list, archive) via HTTP against a real database.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import cookieParser from 'cookie-parser';

import { APP_GUARD } from '@nestjs/core';
import { AuthenticationModule } from '@authentication/infrastructure/authentication.module';
import { UserModule } from '@user/infrastructure/user.module';
import { TenantModule } from '@tenant/tenant.module';
import { StorageModule } from '@storage/storage.module';
import { UnitOfWorkModule } from '@shared/infrastructure/database/unit-of-work.module';
import { MediatorModule } from '@shared/infrastructure/mediator/mediator.module';
import { EmailModule } from '@shared/infrastructure/email/email.module';
import { AuthorizationModule } from '@authorization/infrastructure/authorization.module';
import { SecurityModule } from '@common/security/security.module';
import { SecurityGuard } from '@common/security/security.guard';
import { DomainExceptionFilter } from '@common/filters/domain-exception.filter';
import databaseConfig from '@core/config/database/database.config';
import { validate } from '@core/config/environment/env.validation';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { IEmailProviderContract } from '@shared/infrastructure/email/contracts/email-provider.contract';

// ─── Constants ────────────────────────────────────────────────────────────────

const TRUNCATE_TABLES = [
  // User / Auth tables
  '"profiles"."social_profiles"',
  '"profiles"."personal_profiles"',
  '"profiles"."commercial_profiles"',
  '"profiles"."profiles"',
  '"sessions"."social_sessions"',
  '"sessions"."credential_sessions"',
  '"authn"."verification_attempts"',
  '"authn"."email_verification_tokens"',
  '"authn"."password_reset_tokens"',
  '"sessions"."sessions"',
  '"accounts"."social_accounts"',
  '"accounts"."credential_accounts"',
  '"accounts"."accounts"',
  '"identity"."users"',
  // Tenant tables
  '"tenants"."tenant_invitations"',
  '"tenants"."tenant_members"',
  '"tenants"."tenant_profiles"',
  '"tenants"."tenant_config"',
  '"tenants"."tenants"',
  // Storage tables
  '"storage"."custom_rooms"',
  '"storage"."store_rooms"',
  '"storage"."warehouses"',
  '"storage"."storages"',
] as const;

// ─── Singleton state ──────────────────────────────────────────────────────────

interface StorageWorkerApp {
  readonly app: INestApplication;
  readonly dataSource: DataSource;
}

let storageWorkerAppInstance: StorageWorkerApp | null = null;
let storageWorkerAppPromise: Promise<StorageWorkerApp> | null = null;

// ─── Email provider mock ──────────────────────────────────────────────────────

export const storageEmailProviderMock: jest.Mocked<IEmailProviderContract> = {
  sendEmail: jest.fn().mockResolvedValue({ id: 'mock-id', success: true }),
  sendVerificationEmail: jest.fn().mockResolvedValue({ id: 'mock-id', success: true }),
  sendWelcomeEmail: jest.fn().mockResolvedValue({ id: 'mock-id', success: true }),
  sendPasswordResetEmail: jest.fn().mockResolvedValue({ id: 'mock-id', success: true }),
};

// ─── Bootstrap ────────────────────────────────────────────────────────────────

async function bootstrap(): Promise<StorageWorkerApp> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        load: [databaseConfig],
        validate,
        envFilePath: '.env.test',
      }),
      TypeOrmModule.forRoot({
        type: 'postgres',
        host: process.env.DB_HOST ?? 'localhost',
        port: parseInt(process.env.DB_PORT ?? '5434', 10),
        username: process.env.DB_USERNAME ?? 'stocka',
        password: process.env.DB_PASSWORD ?? 'stocka_dev_password',
        database: process.env.DB_DATABASE ?? 'stocka_db',
        autoLoadEntities: true,
        synchronize: false,
        logging: false,
      }),
      EmailModule,
      UnitOfWorkModule,
      UserModule,
      AuthenticationModule,
      TenantModule,
      StorageModule,
      AuthorizationModule,
      SecurityModule,
      MediatorModule,
    ],
    providers: [
      {
        provide: APP_GUARD,
        useClass: SecurityGuard,
      },
    ],
  })
    .overrideProvider(INJECTION_TOKENS.EMAIL_PROVIDER_CONTRACT)
    .useValue(storageEmailProviderMock)
    .compile();

  const app = moduleFixture.createNestApplication();

  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.setGlobalPrefix('api');
  app.useGlobalFilters(new DomainExceptionFilter());

  await app.listen(0);

  const dataSource = moduleFixture.get(DataSource);

  return { app, dataSource };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function getStorageWorkerApp(): Promise<StorageWorkerApp> {
  if (storageWorkerAppInstance) {
    return storageWorkerAppInstance;
  }

  if (!storageWorkerAppPromise) {
    storageWorkerAppPromise = bootstrap().then((instance) => {
      storageWorkerAppInstance = instance;
      return instance;
    });
  }

  return storageWorkerAppPromise;
}

/**
 * Resets all storage email provider mock methods to their default resolved values.
 * Use this instead of jest.resetAllMocks() to avoid nuking internal NestJS providers.
 */
export function resetStorageEmailMock(): void {
  storageEmailProviderMock.sendEmail
    .mockReset()
    .mockResolvedValue({ id: 'mock-id', success: true });
  storageEmailProviderMock.sendVerificationEmail
    .mockReset()
    .mockResolvedValue({ id: 'mock-id', success: true });
  storageEmailProviderMock.sendWelcomeEmail
    .mockReset()
    .mockResolvedValue({ id: 'mock-id', success: true });
  storageEmailProviderMock.sendPasswordResetEmail
    .mockReset()
    .mockResolvedValue({ id: 'mock-id', success: true });
}

export async function truncateStorageWorkerTables(dataSource: DataSource): Promise<void> {
  const tableList = TRUNCATE_TABLES.join(', ');
  await dataSource.query(`TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE`);
}

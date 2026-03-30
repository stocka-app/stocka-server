/**
 * Tenant-scoped NestJS application singleton for invitation e2e tests.
 *
 * Extends the base worker-app pattern with TenantModule and CapabilityModule
 * to exercise the full invitation flow via HTTP.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import cookieParser from 'cookie-parser';

import { AuthenticationModule } from '@authentication/infrastructure/authentication.module';
import { UserModule } from '@user/infrastructure/user.module';
import { TenantModule } from '@tenant/tenant.module';
import { UnitOfWorkModule } from '@shared/infrastructure/database/unit-of-work.module';
import { MediatorModule } from '@shared/infrastructure/mediator/mediator.module';
import { EmailModule } from '@shared/infrastructure/email/email.module';
import { CapabilityModule } from '@shared/infrastructure/policy/capability.module';
import { DomainExceptionFilter } from '@common/filters/domain-exception.filter';
import databaseConfig from '@core/config/database/database.config';
import { validate } from '@core/config/environment/env.validation';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { IEmailProviderContract } from '@shared/infrastructure/email/contracts/email-provider.contract';

// ─── Constants ────────────────────────────────────────────────────────────────

const TRUNCATE_TABLES = [
  // User / Auth tables (schema-qualified)
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
  // Tenant tables (schema-qualified)
  '"tenants"."tenant_invitations"',
  '"tenants"."tenant_members"',
  '"tenants"."tenant_profiles"',
  '"tenants"."tenant_config"',
  '"tenants"."tenants"',
] as const;

// ─── Singleton state ──────────────────────────────────────────────────────────

interface TenantWorkerApp {
  readonly app: INestApplication;
  readonly dataSource: DataSource;
}

let tenantWorkerAppInstance: TenantWorkerApp | null = null;
let tenantWorkerAppPromise: Promise<TenantWorkerApp> | null = null;

// ─── Email provider mock ──────────────────────────────────────────────────────

export const tenantEmailProviderMock: jest.Mocked<IEmailProviderContract> = {
  sendEmail: jest.fn().mockResolvedValue({ id: 'mock-id', success: true }),
  sendVerificationEmail: jest.fn().mockResolvedValue({ id: 'mock-id', success: true }),
  sendWelcomeEmail: jest.fn().mockResolvedValue({ id: 'mock-id', success: true }),
  sendPasswordResetEmail: jest.fn().mockResolvedValue({ id: 'mock-id', success: true }),
};

// ─── Bootstrap ────────────────────────────────────────────────────────────────

async function bootstrap(): Promise<TenantWorkerApp> {
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
      CapabilityModule,
      MediatorModule,
    ],
  })
    .overrideProvider(INJECTION_TOKENS.EMAIL_PROVIDER_CONTRACT)
    .useValue(tenantEmailProviderMock)
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

export async function getTenantWorkerApp(): Promise<TenantWorkerApp> {
  if (tenantWorkerAppInstance) {
    return tenantWorkerAppInstance;
  }

  if (!tenantWorkerAppPromise) {
    tenantWorkerAppPromise = bootstrap().then((instance) => {
      tenantWorkerAppInstance = instance;
      return instance;
    });
  }

  return tenantWorkerAppPromise;
}

/**
 * Resets all tenant email provider mock methods to their default resolved values.
 * Use this instead of jest.resetAllMocks() to avoid nuking internal NestJS providers.
 */
export function resetTenantEmailMock(): void {
  tenantEmailProviderMock.sendEmail.mockReset().mockResolvedValue({ id: 'mock-id', success: true });
  tenantEmailProviderMock.sendVerificationEmail
    .mockReset()
    .mockResolvedValue({ id: 'mock-id', success: true });
  tenantEmailProviderMock.sendWelcomeEmail
    .mockReset()
    .mockResolvedValue({ id: 'mock-id', success: true });
  tenantEmailProviderMock.sendPasswordResetEmail
    .mockReset()
    .mockResolvedValue({ id: 'mock-id', success: true });
}

export async function truncateTenantWorkerTables(dataSource: DataSource): Promise<void> {
  const tableList = TRUNCATE_TABLES.join(', ');
  await dataSource.query(`TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE`);
}

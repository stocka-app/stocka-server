/**
 * Permission-guard-scoped NestJS application singleton for PermissionGuard e2e tests.
 *
 * Extends the tenant worker app with StorageModule and registers PermissionGuard
 * as a global APP_GUARD. Also adds an Express middleware that extracts and sets
 * request.user from the JWT Bearer token before guards run.
 *
 * This middleware is required because PermissionGuard is a global guard and therefore
 * runs BEFORE class-level JwtAuthenticationGuard. Without it, request.user is always
 * undefined when PermissionGuard executes, causing it to always throw NOT_AUTHENTICATED.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { APP_GUARD } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { JwtService } from '@nestjs/jwt';
import type { Request, Response, NextFunction } from 'express';

import { AuthenticationModule } from '@authentication/infrastructure/authentication.module';
import { UserModule } from '@user/infrastructure/user.module';
import { TenantModule } from '@tenant/tenant.module';
import { StorageModule } from '@storage/storage.module';
import { UnitOfWorkModule } from '@shared/infrastructure/database/unit-of-work.module';
import { MediatorModule } from '@shared/infrastructure/mediator/mediator.module';
import { EmailModule } from '@shared/infrastructure/email/email.module';
import { CapabilityModule } from '@shared/infrastructure/policy/capability.module';
import { PermissionGuard } from '@common/guards/permission.guard';
import { DomainExceptionFilter } from '@common/filters/domain-exception.filter';
import databaseConfig from '@core/config/database/database.config';
import { validate } from '@core/config/environment/env.validation';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { IEmailProviderContract } from '@shared/infrastructure/email/contracts/email-provider.contract';
import { JwtPayload } from '@common/decorators/current-user.decorator';

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

interface PermissionGuardWorkerApp {
  readonly app: INestApplication;
  readonly dataSource: DataSource;
}

let permissionGuardWorkerAppInstance: PermissionGuardWorkerApp | null = null;
let permissionGuardWorkerAppPromise: Promise<PermissionGuardWorkerApp> | null = null;

// ─── Email provider mock ──────────────────────────────────────────────────────

export const permissionGuardEmailMock: jest.Mocked<IEmailProviderContract> = {
  sendEmail: jest.fn().mockResolvedValue({ id: 'mock-id', success: true }),
  sendVerificationEmail: jest.fn().mockResolvedValue({ id: 'mock-id', success: true }),
  sendWelcomeEmail: jest.fn().mockResolvedValue({ id: 'mock-id', success: true }),
  sendPasswordResetEmail: jest.fn().mockResolvedValue({ id: 'mock-id', success: true }),
};

// ─── Bootstrap ────────────────────────────────────────────────────────────────

async function bootstrap(): Promise<PermissionGuardWorkerApp> {
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
      CapabilityModule,
      MediatorModule,
    ],
    providers: [
      {
        provide: APP_GUARD,
        useClass: PermissionGuard,
      },
    ],
  })
    .overrideProvider(INJECTION_TOKENS.EMAIL_PROVIDER_CONTRACT)
    .useValue(permissionGuardEmailMock)
    .compile();

  // Obtain JwtService to decode tokens in the pre-guard middleware.
  // This is the same JwtService used by AuthenticationModule — same secret, same config.
  const jwtService = moduleFixture.get<JwtService>(JwtService);

  const app = moduleFixture.createNestApplication();

  app.use(cookieParser());

  // ── JWT extraction middleware ───────────────────────────────────────────────
  // Sets request.user BEFORE global guards run so PermissionGuard can evaluate
  // the authenticated user's membership context and permissions.
  //
  // Why this is needed: PermissionGuard is registered as APP_GUARD (global) and
  // therefore runs BEFORE class-level JwtAuthenticationGuard. Without this
  // middleware, request.user is always undefined when PermissionGuard runs, which
  // would cause it to throw NOT_AUTHENTICATED for every @RequireAction endpoint —
  // even for correctly authenticated users. The middleware mirrors what
  // JwtAuthenticationGuard does, but at the Express middleware layer (before guards).
  app.use((req: Request, _res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      try {
        const decoded = jwtService.verify<{
          sub: string;
          email: string;
          tenantId: string | null;
          role: string | null;
        }>(token);
        req.user = {
          uuid: decoded.sub,
          email: decoded.email,
          tenantId: decoded.tenantId,
          role: decoded.role,
        } as JwtPayload;
      } catch {
        // Invalid or expired token — leave request.user undefined.
        // PermissionGuard will throw NOT_AUTHENTICATED for @RequireAction endpoints.
      }
    }
    next();
  });

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

export async function getPermissionGuardWorkerApp(): Promise<PermissionGuardWorkerApp> {
  if (permissionGuardWorkerAppInstance) {
    return permissionGuardWorkerAppInstance;
  }

  if (!permissionGuardWorkerAppPromise) {
    permissionGuardWorkerAppPromise = bootstrap().then((inst) => {
      permissionGuardWorkerAppInstance = inst;
      return inst;
    });
  }

  return permissionGuardWorkerAppPromise;
}

/**
 * Resets all permission guard email provider mock methods to their default resolved values.
 * Use this instead of jest.resetAllMocks() to avoid nuking internal NestJS providers.
 */
export function resetPermissionGuardEmailMock(): void {
  permissionGuardEmailMock.sendEmail
    .mockReset()
    .mockResolvedValue({ id: 'mock-id', success: true });
  permissionGuardEmailMock.sendVerificationEmail
    .mockReset()
    .mockResolvedValue({ id: 'mock-id', success: true });
  permissionGuardEmailMock.sendWelcomeEmail
    .mockReset()
    .mockResolvedValue({ id: 'mock-id', success: true });
  permissionGuardEmailMock.sendPasswordResetEmail
    .mockReset()
    .mockResolvedValue({ id: 'mock-id', success: true });
}

export async function truncatePermissionGuardWorkerTables(dataSource: DataSource): Promise<void> {
  const tableList = TRUNCATE_TABLES.join(', ');
  await dataSource.query(`TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE`);
}

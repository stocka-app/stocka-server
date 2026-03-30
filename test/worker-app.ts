/**
 * Worker-scoped NestJS application singleton.
 *
 * With --runInBand all specs share a single process and this singleton is shared
 * across all specs. Run e2e tests with `test:e2e:seq` (--runInBand) to avoid
 * data races — the 12 domain schemas (authn, authz, identity, accounts, sessions,
 * profiles, tenants, tiers, capabilities, storage, onboarding, shared) are shared
 * and per-worker isolation is not available with entity-declared schemas.
 *
 * Key decisions:
 *  - `synchronize: false` — globalSetup already created domain schemas + ran migrations.
 *  - No connection-level `schema` — entities declare their own schemas; TypeORM uses
 *    schema-qualified names (e.g. "identity"."users") in all generated SQL.
 *  - `app.listen(0)` — binds to a random available OS port; supertest uses
 *    app.getHttpServer() which works regardless of port.
 *  - The singleton is never closed — the Jest worker process exits (--forceExit)
 *    which cleanly terminates all pg pool connections.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import cookieParser from 'cookie-parser';

import { AuthenticationModule } from '@authentication/infrastructure/authentication.module';
import { UserModule } from '@user/infrastructure/user.module';
import { UnitOfWorkModule } from '@shared/infrastructure/database/unit-of-work.module';
import { MediatorModule } from '@shared/infrastructure/mediator/mediator.module';
import { EmailModule } from '@shared/infrastructure/email/email.module';
import { DomainExceptionFilter } from '@common/filters/domain-exception.filter';
import databaseConfig from '@core/config/database/database.config';
import { validate } from '@core/config/environment/env.validation';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { IEmailProviderContract } from '@shared/infrastructure/email/contracts/email-provider.contract';

// ─── Constants ────────────────────────────────────────────────────────────────

// Tables to truncate between specs (restores a clean slate without a full schema drop).
// Order does not matter because CASCADE handles FK dependencies.
// Schema-qualified names are required since entities live in named PostgreSQL schemas.
// NOTE: profile tables (social_profiles, personal_profiles, commercial_profiles, profiles)
// are NOT reachable via FK cascade from users — ProfileEntity has no @ManyToOne decorator,
// so there is no FK. They must be listed explicitly.
const TRUNCATE_TABLES = [
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
  '"identity"."user_consents"',
  '"identity"."users"',
] as const;

// ─── Singleton state ──────────────────────────────────────────────────────────

interface WorkerApp {
  readonly app: INestApplication;
  readonly dataSource: DataSource;
}

let workerAppInstance: WorkerApp | null = null;
let workerAppPromise: Promise<WorkerApp> | null = null;

// ─── Email provider mock ──────────────────────────────────────────────────────

export const emailProviderMock: jest.Mocked<IEmailProviderContract> = {
  sendEmail: jest.fn().mockResolvedValue({ id: 'mock-id', success: true }),
  sendVerificationEmail: jest.fn().mockResolvedValue({ id: 'mock-id', success: true }),
  sendWelcomeEmail: jest.fn().mockResolvedValue({ id: 'mock-id', success: true }),
  sendPasswordResetEmail: jest.fn().mockResolvedValue({ id: 'mock-id', success: true }),
};

// ─── Bootstrap ────────────────────────────────────────────────────────────────

async function bootstrap(): Promise<WorkerApp> {
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
      MediatorModule,
    ],
  })
    .overrideProvider(INJECTION_TOKENS.EMAIL_PROVIDER_CONTRACT)
    .useValue(emailProviderMock)
    .compile();

  const app = moduleFixture.createNestApplication();

  // Standard middleware / pipes / filters applied by all HTTP specs.
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.setGlobalPrefix('api');
  app.useGlobalFilters(new DomainExceptionFilter());

  // listen(0) binds to a random available port — required for supertest's
  // getHttpServer() to work across parallel workers without port collisions.
  await app.listen(0);

  const dataSource = moduleFixture.get(DataSource);

  return { app, dataSource };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns the worker-scoped NestJS app singleton, creating it on the first call.
 * Subsequent calls return the same instance without re-bootstrapping.
 */
export async function getWorkerApp(): Promise<WorkerApp> {
  if (workerAppInstance) {
    return workerAppInstance;
  }

  if (!workerAppPromise) {
    workerAppPromise = bootstrap().then((instance) => {
      workerAppInstance = instance;
      return instance;
    });
  }

  return workerAppPromise;
}

/**
 * Truncates all application tables with RESTART IDENTITY CASCADE.
 * Use in afterAll to leave the schema clean for the next spec running in this worker.
 * Keep existing per-test DELETE queries in beforeEach/afterEach — they are still needed
 * for isolation between individual tests within a spec.
 */
/**
 * Resets all email provider mock methods to their default resolved values.
 * Use this instead of jest.resetAllMocks() which nukes ALL mocks (including
 * internal NestJS providers) and leaves the email mock without implementations.
 */
export function resetEmailMock(): void {
  emailProviderMock.sendEmail.mockReset().mockResolvedValue({ id: 'mock-id', success: true });
  emailProviderMock.sendVerificationEmail
    .mockReset()
    .mockResolvedValue({ id: 'mock-id', success: true });
  emailProviderMock.sendWelcomeEmail
    .mockReset()
    .mockResolvedValue({ id: 'mock-id', success: true });
  emailProviderMock.sendPasswordResetEmail
    .mockReset()
    .mockResolvedValue({ id: 'mock-id', success: true });
}

export async function truncateWorkerTables(dataSource: DataSource): Promise<void> {
  const tableList = TRUNCATE_TABLES.join(', ');
  await dataSource.query(`TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE`);
}

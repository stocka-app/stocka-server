/**
 * Worker-scoped NestJS application singleton (Strategy 3).
 *
 * With --runInBand all specs share JEST_WORKER_ID=1 and a single process,
 * so this module is evaluated once and the singleton is shared across all 15 specs.
 * With parallel workers (maxWorkers=4), each worker process has its own module scope
 * and therefore its own singleton — fully isolated via schema (test_w1..test_wN).
 *
 * Key decisions:
 *  - `synchronize: false` — globalSetup already ran dropSchema + synchronize once.
 *  - `schema: schemaName` — TypeORM sets search_path on every connection; all queries
 *    are automatically scoped to this schema with zero additional effort per query.
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
const TRUNCATE_TABLES = [
  'verification_attempts',
  'email_verification_tokens',
  'password_reset_tokens',
  'sessions',
  'social_accounts',
  'credential_accounts',
  'accounts',
  'users',
] as const;

// ─── Singleton state ──────────────────────────────────────────────────────────

interface WorkerApp {
  readonly app: INestApplication;
  readonly dataSource: DataSource;
}

let workerAppInstance: WorkerApp | null = null;
let workerAppPromise: Promise<WorkerApp> | null = null;

// ─── Schema name ──────────────────────────────────────────────────────────────

export function getWorkerSchemaName(): string {
  const workerId = process.env.JEST_WORKER_ID ?? '1';
  return `test_w${workerId}`;
}

// ─── Email provider mock ──────────────────────────────────────────────────────

export const emailProviderMock: jest.Mocked<IEmailProviderContract> = {
  sendEmail: jest.fn().mockResolvedValue({ id: 'mock-id', success: true }),
  sendVerificationEmail: jest.fn().mockResolvedValue({ id: 'mock-id', success: true }),
  sendWelcomeEmail: jest.fn().mockResolvedValue({ id: 'mock-id', success: true }),
  sendPasswordResetEmail: jest.fn().mockResolvedValue({ id: 'mock-id', success: true }),
};

// ─── Bootstrap ────────────────────────────────────────────────────────────────

async function bootstrap(): Promise<WorkerApp> {
  const schemaName = getWorkerSchemaName();

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
        schema: schemaName,
        autoLoadEntities: true,
        synchronize: false,
        logging: false,
        // Set search_path so raw SQL queries (dataSource.query) also land in the correct
        // worker schema. Without this, raw queries fall back to the public schema.
        // pg passes `options` as a PostgreSQL startup parameter (equivalent to SET search_path).
        extra: {
          options: `-c search_path=${schemaName}`,
        },
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
export async function truncateWorkerTables(dataSource: DataSource): Promise<void> {
  const tableList = TRUNCATE_TABLES.map((t) => `"${t}"`).join(', ');
  await dataSource.query(`TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE`);
}

/**
 * Jest global setup — runs ONCE before all e2e specs (in the main Jest process).
 *
 * Responsibilities:
 *  1. Set synchronous_commit = off on the test database (Strategy 2) — eliminates
 *     fsync wait on every INSERT/UPDATE across all specs.
 *  2. Create N isolated PostgreSQL schemas (test_w1..test_wN), one per Jest worker
 *     (Strategy 5). Each schema is freshly dropped and re-synchronized so the
 *     schema always matches the current entity definitions.
 *
 * Worker assignment:
 *  Jest sets JEST_WORKER_ID=1 with --runInBand (single worker).
 *  With maxWorkers=4 (parallel run), workers receive IDs 1..4.
 *  worker-app.ts reads JEST_WORKER_ID to select the correct schema.
 *
 * Per-spec setup (beforeAll/afterAll) is handled by worker-app.ts — each spec
 * calls getWorkerApp() to obtain the pre-booted singleton NestJS app.
 */
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { AuthenticationModule } from '@authentication/infrastructure/authentication.module';
import { UserModule } from '@user/infrastructure/user.module';
import { TenantModule } from '@tenant/tenant.module';
import { UnitOfWorkModule } from '@shared/infrastructure/database/unit-of-work.module';
import { MediatorModule } from '@shared/infrastructure/mediator/mediator.module';
import { EmailModule } from '@shared/infrastructure/email/email.module';
import { CapabilityModule } from '@shared/infrastructure/policy/capability.module';
import databaseConfig from '@core/config/database/database.config';
import { validate } from '@core/config/environment/env.validation';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { IEmailProviderContract } from '@shared/infrastructure/email/contracts/email-provider.contract';

const emailProviderMock: IEmailProviderContract = {
  sendEmail: async (): Promise<{ id: string; success: boolean }> => ({ id: 'mock', success: true }),
  sendVerificationEmail: async (): Promise<{ id: string; success: boolean }> => ({
    id: 'mock',
    success: true,
  }),
  sendWelcomeEmail: async (): Promise<{ id: string; success: boolean }> => ({
    id: 'mock',
    success: true,
  }),
  sendPasswordResetEmail: async (): Promise<{ id: string; success: boolean }> => ({
    id: 'mock',
    success: true,
  }),
};

const MAX_WORKERS = parseInt(process.env.E2E_WORKERS ?? '4', 10);

async function setSynchronousCommitOff(): Promise<void> {
  // Connect briefly to run the ALTER DATABASE statement, then disconnect.
  // This is a session-level setting applied at database level so every new
  // connection inherits it — eliminating fsync round-trips for all test writes.
  const moduleRef = await Test.createTestingModule({
    imports: [
      TypeOrmModule.forRoot({
        type: 'postgres',
        host: process.env.DB_HOST ?? 'localhost',
        port: parseInt(process.env.DB_PORT ?? '5434', 10),
        username: process.env.DB_USERNAME ?? 'stocka',
        password: process.env.DB_PASSWORD ?? 'stocka_dev_password',
        database: process.env.DB_DATABASE ?? 'stocka_db',
        synchronize: false,
        logging: false,
        extra: { max: 1 },
      }),
    ],
  }).compile();

  const ds = moduleRef.get(DataSource);
  await ds.query(
    `ALTER DATABASE "${process.env.DB_DATABASE ?? 'stocka_db'}" SET synchronous_commit = off`,
  );
  await ds.destroy();
}

async function createWorkerSchema(workerId: number): Promise<void> {
  const schemaName = `test_w${workerId}`;

  // TypeORM's dropSchema requires the schema to already exist in PostgreSQL.
  // We must CREATE SCHEMA IF NOT EXISTS first, then let TypeORM drop + recreate it.
  const bootstrapModuleRef = await Test.createTestingModule({
    imports: [
      TypeOrmModule.forRoot({
        type: 'postgres',
        host: process.env.DB_HOST ?? 'localhost',
        port: parseInt(process.env.DB_PORT ?? '5434', 10),
        username: process.env.DB_USERNAME ?? 'stocka',
        password: process.env.DB_PASSWORD ?? 'stocka_dev_password',
        database: process.env.DB_DATABASE ?? 'stocka_db',
        synchronize: false,
        logging: false,
        extra: { max: 1 },
      }),
    ],
  }).compile();
  const bootstrapDs = bootstrapModuleRef.get(DataSource);
  await bootstrapDs.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
  // Ensure uuid-ossp is installed in public schema (survives per-worker dropSchema).
  // TenantInvitationEntity uses @PrimaryGeneratedColumn('uuid') which requires uuid_generate_v4().
  await bootstrapDs.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA public`);
  await bootstrapDs.destroy();

  const moduleRef = await Test.createTestingModule({
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
        dropSchema: true,
        synchronize: true,
        logging: false,
        extra: {
          max: 1,
          // Include public so uuid_generate_v4() (uuid-ossp in public schema) is found during
          // CREATE TABLE DDL emitted by @PrimaryGeneratedColumn('uuid') on TenantInvitationEntity.
          options: `-c search_path=${schemaName},public`,
        },
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
    .useValue(emailProviderMock)
    .compile();

  const app: INestApplication = moduleRef.createNestApplication();
  await app.init();
  await app.close();
}

export default async function globalSetup(): Promise<void> {
  // Strategy 2: turn off WAL fsync for the test DB (applied once, persists for session).
  await setSynchronousCommitOff();

  // Strategy 5: create one isolated schema per Jest worker, all in parallel.
  await Promise.all(Array.from({ length: MAX_WORKERS }, (_, i) => createWorkerSchema(i + 1)));
}

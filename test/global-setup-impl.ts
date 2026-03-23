/**
 * Jest global setup — runs ONCE before all e2e specs (in the main Jest process).
 *
 * Responsibilities:
 *  1. Set synchronous_commit = off on the test database — eliminates fsync wait on
 *     every INSERT/UPDATE across all specs.
 *  2. Drop and recreate the 12 domain schemas (authn, authz, identity, accounts,
 *     sessions, profiles, tenants, tiers, capabilities, storage, onboarding, shared)
 *     and run all production migrations inside them.
 *     This guarantees the test DB schema is always identical to what migration:run
 *     produces. Any entity/migration mismatch surfaces here as a RED failure.
 *
 * NOTE: With named entity schemas, per-worker schema isolation is not possible
 * (TypeORM uses schema-qualified names from the entity decorator, bypassing the
 * connection-level schema setting). All e2e specs share the same domain schemas.
 * Use `--runInBand` (test:e2e:seq) to avoid data races between parallel workers.
 */
import * as path from 'path';
import { DataSource } from 'typeorm';

const DOMAIN_SCHEMAS = [
  'authn',
  'authz',
  'identity',
  'accounts',
  'sessions',
  'profiles',
  'tenants',
  'tiers',
  'capabilities',
  'storage',
  'onboarding',
  'shared',
] as const;

async function setSynchronousCommitOff(): Promise<void> {
  const ds = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5434', 10),
    username: process.env.DB_USERNAME ?? 'stocka',
    password: process.env.DB_PASSWORD ?? 'stocka_dev_password',
    database: process.env.DB_DATABASE ?? 'stocka_db',
    synchronize: false,
    logging: false,
    extra: { max: 1 },
  });
  await ds.initialize();
  await ds.query(
    `ALTER DATABASE "${process.env.DB_DATABASE ?? 'stocka_db'}" SET synchronous_commit = off`,
  );
  await ds.destroy();
}

async function setupDomainSchemas(): Promise<void> {
  // Step 1: Drop and recreate each domain schema; ensure uuid-ossp is available.
  // Also drop the migrations tracking table so migrations run fresh on every test run.
  const setupDs = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5434', 10),
    username: process.env.DB_USERNAME ?? 'stocka',
    password: process.env.DB_PASSWORD ?? 'stocka_dev_password',
    database: process.env.DB_DATABASE ?? 'stocka_db',
    synchronize: false,
    logging: false,
    extra: { max: 1 },
  });
  await setupDs.initialize();

  for (const schema of DOMAIN_SCHEMAS) {
    await setupDs.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await setupDs.query(`CREATE SCHEMA "${schema}"`);
  }

  // Reset the migrations tracking table so TypeORM re-applies all migrations.
  await setupDs.query(`DROP TABLE IF EXISTS "public"."migrations"`);

  // Ensure uuid-ossp extension is available for uuid_generate_v4() in DDL.
  await setupDs.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA public`);

  await setupDs.destroy();

  // Step 2: Run all production migrations — tables land in their declared schemas.
  const migrationDs = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5434', 10),
    username: process.env.DB_USERNAME ?? 'stocka',
    password: process.env.DB_PASSWORD ?? 'stocka_dev_password',
    database: process.env.DB_DATABASE ?? 'stocka_db',
    synchronize: false,
    logging: false,
    migrations: [path.join(__dirname, '../src/core/infrastructure/migrations/*{.ts,.js}')],
    extra: { max: 1 },
  });
  await migrationDs.initialize();
  await migrationDs.runMigrations();
  await migrationDs.destroy();

  // Step 3: Run all seeds — catalog data (roles, tiers, capabilities).
  const seedDs = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5434', 10),
    username: process.env.DB_USERNAME ?? 'stocka',
    password: process.env.DB_PASSWORD ?? 'stocka_dev_password',
    database: process.env.DB_DATABASE ?? 'stocka_db',
    synchronize: false,
    logging: false,
    migrations: [path.join(__dirname, '../src/core/infrastructure/seeds/*{.ts,.js}')],
    extra: { max: 1 },
  });
  await seedDs.initialize();
  await seedDs.runMigrations();
  await seedDs.destroy();
}

export default async function globalSetup(): Promise<void> {
  await setSynchronousCommitOff();
  await setupDomainSchemas();
}

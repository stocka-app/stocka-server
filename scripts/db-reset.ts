/**
 * Database reset script — drops all domain schemas and re-runs migrations.
 *
 * Usage:
 *   npm run db:reset              # reset dev database
 *   npm run db:reset -- --seed    # reset + seed (future use)
 *
 * This produces an identical result to what the e2e test globalSetup does:
 * drop 12 domain schemas → recreate them → run all production migrations.
 * The database ends up structurally identical to a fresh `migration:run`.
 *
 * Safety: refuses to run against any database that does NOT match DB_DATABASE
 * from the .env file (defaults to stocka_db). Will never run against a
 * production-looking host (checks for common production hostnames).
 */
import * as path from 'path';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

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

const BLOCKED_HOSTS = ['production', 'prod', 'rds.amazonaws.com', 'cloud.google.com'];

function getConnectionConfig() {
  return {
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5434', 10),
    username: process.env.DB_USERNAME ?? 'stocka',
    password: process.env.DB_PASSWORD ?? 'stocka_dev_password',
    database: process.env.DB_DATABASE ?? 'stocka_db',
  };
}

function assertNotProduction(config: ReturnType<typeof getConnectionConfig>): void {
  const host = config.host.toLowerCase();
  for (const blocked of BLOCKED_HOSTS) {
    if (host.includes(blocked)) {
      console.error(`\n  ABORT: host "${config.host}" looks like a production database.\n`);
      process.exit(1);
    }
  }
}

async function resetDatabase(): Promise<void> {
  const config = getConnectionConfig();
  assertNotProduction(config);

  console.log(`\n  Resetting database "${config.database}" on ${config.host}:${config.port}\n`);

  // Step 1: Drop and recreate all domain schemas
  const ds = new DataSource({
    type: 'postgres',
    ...config,
    synchronize: false,
    logging: false,
    extra: { max: 1 },
  });

  await ds.initialize();

  console.log('  Dropping schemas...');
  for (const schema of DOMAIN_SCHEMAS) {
    await ds.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  }

  console.log('  Recreating schemas...');
  for (const schema of DOMAIN_SCHEMAS) {
    await ds.query(`CREATE SCHEMA "${schema}"`);
  }

  // Reset migrations tracking table
  await ds.query(`DROP TABLE IF EXISTS "public"."migrations"`);

  // Ensure uuid-ossp extension is available
  await ds.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA public`);

  await ds.destroy();

  // Step 2: Run all production migrations
  console.log('  Running migrations...');
  const migrationDs = new DataSource({
    type: 'postgres',
    ...config,
    synchronize: false,
    logging: false,
    migrations: [path.join(__dirname, '../src/core/infrastructure/migrations/*{.ts,.js}')],
    extra: { max: 1 },
  });

  await migrationDs.initialize();
  await migrationDs.runMigrations();
  await migrationDs.destroy();

  console.log('  Done! Database is clean and ready.\n');
}

resetDatabase().catch((err) => {
  console.error('\n  Database reset failed:\n', err);
  process.exit(1);
});

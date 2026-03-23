/**
 * Soft database reset — truncates all user/tenant data while preserving
 * catalog seed data (roles, tiers, capabilities, action grants).
 *
 * Use this when you want a clean slate for manual testing without having
 * to re-run seeds afterwards.
 *
 * Usage:
 *   npm run typeorm:db:reset
 *
 * Safety: refuses to run against production-looking hosts.
 */
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

// Tables that hold catalog/reference data — never truncated
const CATALOG_TABLES = new Set([
  'tiers.tier_plans',
  'tiers.tier_module_policies',
  'tiers.tier_action_overrides',
  'capabilities.modules',
  'capabilities.catalog_actions',
  'authz.roles',
  'authz.role_action_grants',
  'authz.role_delegation_rules',
]);

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
];

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

async function softReset(): Promise<void> {
  const config = getConnectionConfig();
  assertNotProduction(config);

  console.log(`\n  Soft reset on "${config.database}" @ ${config.host}:${config.port}`);
  console.log('  Catalog data will be preserved.\n');

  const ds = new DataSource({
    type: 'postgres',
    ...config,
    synchronize: false,
    logging: false,
    extra: { max: 1 },
  });

  await ds.initialize();

  // Discover all tables in domain schemas
  const rows: { table_schema: string; table_name: string }[] = await ds.query(
    `SELECT table_schema, table_name
     FROM information_schema.tables
     WHERE table_schema = ANY($1)
       AND table_type = 'BASE TABLE'`,
    [DOMAIN_SCHEMAS],
  );

  const toTruncate = rows
    .filter((r) => !CATALOG_TABLES.has(`${r.table_schema}.${r.table_name}`))
    .map((r) => `"${r.table_schema}"."${r.table_name}"`);

  if (toTruncate.length === 0) {
    console.log('  Nothing to truncate.\n');
    await ds.destroy();
    return;
  }

  console.log(`  Truncating ${toTruncate.length} tables...`);
  await ds.query(`TRUNCATE ${toTruncate.join(', ')} CASCADE`);

  await ds.destroy();

  console.log('  Done! User data cleared, catalog data intact.\n');
}

softReset().catch((err) => {
  console.error('\n  Soft reset failed:\n', err);
  process.exit(1);
});

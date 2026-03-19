import { MigrationInterface, QueryRunner } from 'typeorm';

export class TierPlanCatalogAndCapabilities1777000000000 implements MigrationInterface {
  name = 'TierPlanCatalogAndCapabilities1777000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─────────────────────────────────────────────────────────────────────────
    // tier_plans — configurable source of truth for tier limits
    // ─────────────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "tier_plans" (
        "tier"           character varying(20)    NOT NULL,
        "name"           character varying(100)   NOT NULL,
        "max_products"   integer,
        "max_users"      integer,
        "max_warehouses" integer                  NOT NULL DEFAULT 0,
        "policy_version" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "created_at"     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at"     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tier_plans" PRIMARY KEY ("tier")
      )
    `);

    // ─────────────────────────────────────────────────────────────────────────
    // modules — catalog of functional modules
    // ─────────────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "modules" (
        "id"        SERIAL                   NOT NULL,
        "key"       character varying(100)   NOT NULL,
        "name"      character varying(200)   NOT NULL,
        "is_active" boolean                  NOT NULL DEFAULT true,
        CONSTRAINT "UQ_modules_key" UNIQUE ("key"),
        CONSTRAINT "PK_modules"    PRIMARY KEY ("id")
      )
    `);

    // ─────────────────────────────────────────────────────────────────────────
    // catalog_actions — system actions linked to modules
    // ─────────────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "catalog_actions" (
        "id"          SERIAL                 NOT NULL,
        "module_id"   integer                NOT NULL,
        "key"         character varying(100) NOT NULL,
        "name"        character varying(200) NOT NULL,
        "action_type" character varying(50)  NOT NULL,
        "is_active"   boolean                NOT NULL DEFAULT true,
        CONSTRAINT "UQ_catalog_actions_key" UNIQUE ("key"),
        CONSTRAINT "PK_catalog_actions"     PRIMARY KEY ("id")
      )
    `);

    // ─────────────────────────────────────────────────────────────────────────
    // tier_module_policies — tier-level module restrictions
    // ─────────────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "tier_module_policies" (
        "tier"      character varying(20) NOT NULL,
        "module_id" integer               NOT NULL,
        "enabled"   boolean               NOT NULL DEFAULT true,
        "config"    jsonb,
        CONSTRAINT "PK_tier_module_policies" PRIMARY KEY ("tier", "module_id")
      )
    `);

    // ─────────────────────────────────────────────────────────────────────────
    // tier_action_overrides — granular action overrides per tier
    // ─────────────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "tier_action_overrides" (
        "tier"      character varying(20) NOT NULL,
        "action_id" integer               NOT NULL,
        "enabled"   boolean               NOT NULL,
        "config"    jsonb,
        CONSTRAINT "PK_tier_action_overrides" PRIMARY KEY ("tier", "action_id")
      )
    `);

    // ─────────────────────────────────────────────────────────────────────────
    // ALTER tenant_config — add materialized counters + capabilities snapshot
    // ─────────────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "tenant_config"
        ADD COLUMN "product_count"        integer NOT NULL DEFAULT 0,
        ADD COLUMN "storage_count"        integer NOT NULL DEFAULT 0,
        ADD COLUMN "member_count"         integer NOT NULL DEFAULT 1,
        ADD COLUMN "capabilities"         jsonb,
        ADD COLUMN "capabilities_built_at" TIMESTAMP WITH TIME ZONE
    `);

    // =========================================================================
    // Foreign Key Constraints
    // =========================================================================

    // catalog_actions → modules
    await queryRunner.query(`
      ALTER TABLE "catalog_actions"
        ADD CONSTRAINT "FK_catalog_actions_module_id"
        FOREIGN KEY ("module_id") REFERENCES "modules"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // tier_module_policies → tier_plans
    await queryRunner.query(`
      ALTER TABLE "tier_module_policies"
        ADD CONSTRAINT "FK_tier_module_policies_tier"
        FOREIGN KEY ("tier") REFERENCES "tier_plans"("tier") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // tier_module_policies → modules
    await queryRunner.query(`
      ALTER TABLE "tier_module_policies"
        ADD CONSTRAINT "FK_tier_module_policies_module_id"
        FOREIGN KEY ("module_id") REFERENCES "modules"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // tier_action_overrides → tier_plans
    await queryRunner.query(`
      ALTER TABLE "tier_action_overrides"
        ADD CONSTRAINT "FK_tier_action_overrides_tier"
        FOREIGN KEY ("tier") REFERENCES "tier_plans"("tier") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // tier_action_overrides → catalog_actions
    await queryRunner.query(`
      ALTER TABLE "tier_action_overrides"
        ADD CONSTRAINT "FK_tier_action_overrides_action_id"
        FOREIGN KEY ("action_id") REFERENCES "catalog_actions"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // tenant_config.tier → tier_plans.tier
    await queryRunner.query(`
      ALTER TABLE "tenant_config"
        ADD CONSTRAINT "FK_tenant_config_tier"
        FOREIGN KEY ("tier") REFERENCES "tier_plans"("tier") ON DELETE RESTRICT ON UPDATE NO ACTION
    `);

    // =========================================================================
    // Seed Data
    // =========================================================================

    // ── Tier Plans ────────────────────────────────────────────────────────────
    await queryRunner.query(`
      INSERT INTO "tier_plans" ("tier", "name", "max_products", "max_users", "max_warehouses") VALUES
        ('FREE',       'Free',       100,  1,  0),
        ('STARTER',    'Starter',    1000, 5,  3),
        ('GROWTH',     'Growth',     5000, 25, 10),
        ('ENTERPRISE', 'Enterprise', NULL, NULL, 0)
    `);

    // ── Modules ──────────────────────────────────────────────────────────────
    await queryRunner.query(`
      INSERT INTO "modules" ("key", "name") VALUES
        ('inventory', 'Inventory'),
        ('storages',  'Storages'),
        ('reports',   'Reports'),
        ('team',      'Team'),
        ('settings',  'Settings')
    `);

    // ── Catalog Actions ──────────────────────────────────────────────────────
    await queryRunner.query(`
      INSERT INTO "catalog_actions" ("module_id", "key", "name", "action_type") VALUES
        ((SELECT id FROM modules WHERE key = 'storages'),  'STORAGE_CREATE',          'Create Storage',          'write'),
        ((SELECT id FROM modules WHERE key = 'storages'),  'STORAGE_READ',            'Read Storage',            'read'),
        ((SELECT id FROM modules WHERE key = 'storages'),  'STORAGE_UPDATE',          'Update Storage',          'write'),
        ((SELECT id FROM modules WHERE key = 'storages'),  'STORAGE_DELETE',          'Delete Storage',          'delete'),
        ((SELECT id FROM modules WHERE key = 'team'),      'MEMBER_INVITE',           'Invite Member',           'write'),
        ((SELECT id FROM modules WHERE key = 'team'),      'MEMBER_READ',             'Read Members',            'read'),
        ((SELECT id FROM modules WHERE key = 'team'),      'MEMBER_UPDATE_ROLE',      'Update Member Role',      'write'),
        ((SELECT id FROM modules WHERE key = 'team'),      'MEMBER_REMOVE',           'Remove Member',           'delete'),
        ((SELECT id FROM modules WHERE key = 'inventory'), 'PRODUCT_CREATE',          'Create Product',          'write'),
        ((SELECT id FROM modules WHERE key = 'inventory'), 'PRODUCT_READ',            'Read Products',           'read'),
        ((SELECT id FROM modules WHERE key = 'inventory'), 'PRODUCT_UPDATE',          'Update Product',          'write'),
        ((SELECT id FROM modules WHERE key = 'inventory'), 'PRODUCT_DELETE',          'Delete Product',          'delete'),
        ((SELECT id FROM modules WHERE key = 'reports'),   'REPORT_READ',             'Read Reports',            'read'),
        ((SELECT id FROM modules WHERE key = 'reports'),   'REPORT_ADVANCED',         'Advanced Reports',        'read'),
        ((SELECT id FROM modules WHERE key = 'inventory'), 'INVENTORY_EXPORT',        'Export Inventory',        'export'),
        ((SELECT id FROM modules WHERE key = 'settings'),  'TENANT_SETTINGS_READ',    'Read Tenant Settings',    'read'),
        ((SELECT id FROM modules WHERE key = 'settings'),  'TENANT_SETTINGS_UPDATE',  'Update Tenant Settings',  'configure')
    `);

    // ── Tier Module Policies ─────────────────────────────────────────────────
    // FREE: storages disabled, reports basic only
    await queryRunner.query(`
      INSERT INTO "tier_module_policies" ("tier", "module_id", "enabled", "config") VALUES
        ('FREE',       (SELECT id FROM modules WHERE key = 'storages'),  false, NULL),
        ('FREE',       (SELECT id FROM modules WHERE key = 'reports'),   true,  '{"advanced": false}'),
        ('FREE',       (SELECT id FROM modules WHERE key = 'team'),      true,  '{"invitations": false}'),
        ('STARTER',    (SELECT id FROM modules WHERE key = 'reports'),   true,  '{"advanced": false}'),
        ('GROWTH',     (SELECT id FROM modules WHERE key = 'reports'),   true,  '{"advanced": true}'),
        ('ENTERPRISE', (SELECT id FROM modules WHERE key = 'reports'),   true,  '{"advanced": true}')
    `);

    // ── Tier Action Overrides ────────────────────────────────────────────────
    // FREE: disable member management write actions
    await queryRunner.query(`
      INSERT INTO "tier_action_overrides" ("tier", "action_id", "enabled", "config") VALUES
        ('FREE', (SELECT id FROM catalog_actions WHERE key = 'MEMBER_INVITE'),      false, NULL),
        ('FREE', (SELECT id FROM catalog_actions WHERE key = 'MEMBER_UPDATE_ROLE'), false, NULL),
        ('FREE', (SELECT id FROM catalog_actions WHERE key = 'MEMBER_REMOVE'),      false, NULL),
        ('FREE', (SELECT id FROM catalog_actions WHERE key = 'INVENTORY_EXPORT'),   false, NULL),
        ('FREE', (SELECT id FROM catalog_actions WHERE key = 'REPORT_ADVANCED'),    false, NULL)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop FK constraints
    await queryRunner.query(`ALTER TABLE "tenant_config" DROP CONSTRAINT "FK_tenant_config_tier"`);
    await queryRunner.query(
      `ALTER TABLE "tier_action_overrides" DROP CONSTRAINT "FK_tier_action_overrides_action_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tier_action_overrides" DROP CONSTRAINT "FK_tier_action_overrides_tier"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tier_module_policies" DROP CONSTRAINT "FK_tier_module_policies_module_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tier_module_policies" DROP CONSTRAINT "FK_tier_module_policies_tier"`,
    );
    await queryRunner.query(
      `ALTER TABLE "catalog_actions" DROP CONSTRAINT "FK_catalog_actions_module_id"`,
    );

    // Remove new columns from tenant_config
    await queryRunner.query(`
      ALTER TABLE "tenant_config"
        DROP COLUMN "capabilities_built_at",
        DROP COLUMN "capabilities",
        DROP COLUMN "member_count",
        DROP COLUMN "storage_count",
        DROP COLUMN "product_count"
    `);

    // Drop tables in reverse dependency order
    await queryRunner.query(`DROP TABLE "tier_action_overrides"`);
    await queryRunner.query(`DROP TABLE "tier_module_policies"`);
    await queryRunner.query(`DROP TABLE "catalog_actions"`);
    await queryRunner.query(`DROP TABLE "modules"`);
    await queryRunner.query(`DROP TABLE "tier_plans"`);
  }
}

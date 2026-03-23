import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedCatalogActionsAndAddFks1774236551194
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── 1. Seed modules ───────────────────────────────────────────────────────
    await queryRunner.query(`
      INSERT INTO "capabilities"."modules" ("key", "name", "is_active") VALUES
        ('STORAGE',         'Storage Management',        true),
        ('MEMBERS',         'Member Management',         true),
        ('PRODUCTS',        'Product & Inventory',       true),
        ('REPORTS',         'Reports & Analytics',       true),
        ('EXPORT',          'Data Export',               true),
        ('TENANT_SETTINGS', 'Tenant Settings',           true)
    `);

    // ── 2. Seed catalog_actions with module references ────────────────────────
    await queryRunner.query(`
      INSERT INTO "capabilities"."catalog_actions" ("module_id", "key", "name", "action_type", "is_active")
      VALUES
        ((SELECT id FROM capabilities.modules WHERE key = 'STORAGE'),         'STORAGE_CREATE',          'Create Storage',              'WRITE',  true),
        ((SELECT id FROM capabilities.modules WHERE key = 'STORAGE'),         'STORAGE_READ',            'Read Storage',                'READ',   true),
        ((SELECT id FROM capabilities.modules WHERE key = 'STORAGE'),         'STORAGE_UPDATE',          'Update Storage',              'WRITE',  true),
        ((SELECT id FROM capabilities.modules WHERE key = 'STORAGE'),         'STORAGE_DELETE',          'Delete Storage',              'WRITE',  true),
        ((SELECT id FROM capabilities.modules WHERE key = 'MEMBERS'),         'MEMBER_INVITE',           'Invite Member',               'WRITE',  true),
        ((SELECT id FROM capabilities.modules WHERE key = 'MEMBERS'),         'MEMBER_READ',             'Read Members',                'READ',   true),
        ((SELECT id FROM capabilities.modules WHERE key = 'MEMBERS'),         'MEMBER_UPDATE_ROLE',      'Update Member Role',          'WRITE',  true),
        ((SELECT id FROM capabilities.modules WHERE key = 'MEMBERS'),         'MEMBER_REMOVE',           'Remove Member',               'WRITE',  true),
        ((SELECT id FROM capabilities.modules WHERE key = 'PRODUCTS'),        'PRODUCT_CREATE',          'Create Product',              'WRITE',  true),
        ((SELECT id FROM capabilities.modules WHERE key = 'PRODUCTS'),        'PRODUCT_READ',            'Read Products',               'READ',   true),
        ((SELECT id FROM capabilities.modules WHERE key = 'PRODUCTS'),        'PRODUCT_UPDATE',          'Update Product',              'WRITE',  true),
        ((SELECT id FROM capabilities.modules WHERE key = 'PRODUCTS'),        'PRODUCT_DELETE',          'Delete Product',              'WRITE',  true),
        ((SELECT id FROM capabilities.modules WHERE key = 'REPORTS'),         'REPORT_READ',             'Read Reports',                'READ',   true),
        ((SELECT id FROM capabilities.modules WHERE key = 'REPORTS'),         'REPORT_ADVANCED',         'Advanced Reports',            'READ',   true),
        ((SELECT id FROM capabilities.modules WHERE key = 'EXPORT'),          'INVENTORY_EXPORT',        'Export Inventory',            'READ',   true),
        ((SELECT id FROM capabilities.modules WHERE key = 'TENANT_SETTINGS'), 'TENANT_SETTINGS_READ',    'Read Tenant Settings',        'READ',   true),
        ((SELECT id FROM capabilities.modules WHERE key = 'TENANT_SETTINGS'), 'TENANT_SETTINGS_UPDATE',  'Update Tenant Settings',      'WRITE',  true)
    `);

    // ── 3. Add FK: role_action_grants.action_key → catalog_actions.key ────────
    await queryRunner.query(`
      ALTER TABLE "authz"."role_action_grants"
        ADD CONSTRAINT "FK_rag_action_key"
        FOREIGN KEY ("action_key") REFERENCES "capabilities"."catalog_actions"("key")
        ON DELETE CASCADE ON UPDATE CASCADE
    `);

    // ── 4. Add FK: user_permission_grants.action_key → catalog_actions.key ────
    await queryRunner.query(`
      ALTER TABLE "authz"."user_permission_grants"
        ADD CONSTRAINT "FK_upg_action_key"
        FOREIGN KEY ("action_key") REFERENCES "capabilities"."catalog_actions"("key")
        ON DELETE CASCADE ON UPDATE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ── Remove FKs ────────────────────────────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "authz"."user_permission_grants"
        DROP CONSTRAINT IF EXISTS "FK_upg_action_key"
    `);

    await queryRunner.query(`
      ALTER TABLE "authz"."role_action_grants"
        DROP CONSTRAINT IF EXISTS "FK_rag_action_key"
    `);

    // ── Remove seed data ──────────────────────────────────────────────────────
    await queryRunner.query(`DELETE FROM "capabilities"."catalog_actions"`);
    await queryRunner.query(`DELETE FROM "capabilities"."modules"`);
  }
}

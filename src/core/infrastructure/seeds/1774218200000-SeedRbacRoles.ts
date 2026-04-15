import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedRbacRoles1774218200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── roles ────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      INSERT INTO "authz"."roles" ("key", "name_en", "name_es", "description", "hierarchy_level", "is_system")
      VALUES
        ('OWNER',           'Owner',           'Dueño',      'Business owner. One per tenant, immovable.',                  1, true),
        ('PARTNER',         'Partner',         'Socio',      'Co-administrator with almost all permissions.',               2, true),
        ('MANAGER',         'Manager',         'Gerente',    'Operations management without user management.',              3, true),
        ('BUYER',           'Buyer',           'Comprador',  'Stock replenishment. No sales or financial reports.',         4, true),
        ('WAREHOUSE_KEEPER','Warehouse Keeper','Almacenista','Physical inventory control. No prices or reports.',           5, true),
        ('SALES_REP',       'Sales Rep',       'Vendedor',   'Sales operations. No purchases or management.',               6, true),
        ('VIEWER',          'Viewer',          'Auditor',    'Read-only access.',                                           7, true)
      ON CONFLICT ("key") DO NOTHING
    `);

    // ── role_action_grants ───────────────────────────────────────────────────
    await queryRunner.query(`
      INSERT INTO "authz"."role_action_grants" ("role_key", "action_key") VALUES
        ('OWNER', 'STORAGE_CREATE'),   ('OWNER', 'STORAGE_READ'),    ('OWNER', 'STORAGE_UPDATE'),
        ('OWNER', 'STORAGE_DELETE'),   ('OWNER', 'STORAGE_FREEZE'),  ('OWNER', 'STORAGE_UNFREEZE'),
        ('OWNER', 'STORAGE_ARCHIVE'),  ('OWNER', 'STORAGE_RESTORE'),
        ('OWNER', 'MEMBER_INVITE'),    ('OWNER', 'MEMBER_READ'),
        ('OWNER', 'MEMBER_UPDATE_ROLE'),('OWNER', 'MEMBER_REMOVE'),  ('OWNER', 'PRODUCT_CREATE'),
        ('OWNER', 'PRODUCT_READ'),     ('OWNER', 'PRODUCT_UPDATE'),  ('OWNER', 'PRODUCT_DELETE'),
        ('OWNER', 'REPORT_READ'),      ('OWNER', 'REPORT_ADVANCED'), ('OWNER', 'INVENTORY_EXPORT'),
        ('OWNER', 'TENANT_SETTINGS_READ'), ('OWNER', 'TENANT_SETTINGS_UPDATE'),

        ('PARTNER', 'STORAGE_CREATE'), ('PARTNER', 'STORAGE_READ'),  ('PARTNER', 'STORAGE_UPDATE'),
        ('PARTNER', 'STORAGE_DELETE'), ('PARTNER', 'STORAGE_FREEZE'),('PARTNER', 'STORAGE_UNFREEZE'),
        ('PARTNER', 'STORAGE_ARCHIVE'),('PARTNER', 'STORAGE_RESTORE'),
        ('PARTNER', 'MEMBER_INVITE'), ('PARTNER', 'MEMBER_READ'),
        ('PARTNER', 'MEMBER_UPDATE_ROLE'),('PARTNER', 'MEMBER_REMOVE'),('PARTNER', 'PRODUCT_CREATE'),
        ('PARTNER', 'PRODUCT_READ'),   ('PARTNER', 'PRODUCT_UPDATE'),('PARTNER', 'PRODUCT_DELETE'),
        ('PARTNER', 'REPORT_READ'),    ('PARTNER', 'REPORT_ADVANCED'),('PARTNER', 'INVENTORY_EXPORT'),
        ('PARTNER', 'TENANT_SETTINGS_READ'),

        ('MANAGER', 'STORAGE_READ'),
        ('MANAGER', 'MEMBER_INVITE'), ('MANAGER', 'MEMBER_READ'),
        ('MANAGER', 'PRODUCT_CREATE'), ('MANAGER', 'PRODUCT_READ'),  ('MANAGER', 'PRODUCT_UPDATE'),
        ('MANAGER', 'PRODUCT_DELETE'), ('MANAGER', 'REPORT_READ'),   ('MANAGER', 'REPORT_ADVANCED'),
        ('MANAGER', 'INVENTORY_EXPORT'),('MANAGER', 'TENANT_SETTINGS_READ'),

        ('BUYER', 'PRODUCT_CREATE'),   ('BUYER', 'PRODUCT_READ'),    ('BUYER', 'PRODUCT_UPDATE'),
        ('BUYER', 'REPORT_READ'),      ('BUYER', 'TENANT_SETTINGS_READ'),

        ('WAREHOUSE_KEEPER', 'STORAGE_READ'),  ('WAREHOUSE_KEEPER', 'STORAGE_UPDATE'),
        ('WAREHOUSE_KEEPER', 'PRODUCT_READ'),  ('WAREHOUSE_KEEPER', 'PRODUCT_UPDATE'),
        ('WAREHOUSE_KEEPER', 'INVENTORY_EXPORT'),('WAREHOUSE_KEEPER', 'REPORT_READ'),
        ('WAREHOUSE_KEEPER', 'TENANT_SETTINGS_READ'),

        ('SALES_REP', 'PRODUCT_READ'), ('SALES_REP', 'REPORT_READ'), ('SALES_REP', 'TENANT_SETTINGS_READ'),

        ('VIEWER', 'STORAGE_READ'),    ('VIEWER', 'MEMBER_READ'),    ('VIEWER', 'PRODUCT_READ'),
        ('VIEWER', 'REPORT_READ'),     ('VIEWER', 'TENANT_SETTINGS_READ')
      ON CONFLICT DO NOTHING
    `);

    // ── role_delegation_rules ────────────────────────────────────────────────
    await queryRunner.query(`
      INSERT INTO "authz"."role_delegation_rules" ("inviter_role_key", "target_role_key") VALUES
        ('OWNER',   'PARTNER'), ('OWNER',   'MANAGER'), ('OWNER',   'BUYER'),
        ('OWNER',   'WAREHOUSE_KEEPER'), ('OWNER',   'SALES_REP'), ('OWNER',   'VIEWER'),
        ('PARTNER', 'MANAGER'), ('PARTNER', 'BUYER'),   ('PARTNER', 'WAREHOUSE_KEEPER'),
        ('PARTNER', 'SALES_REP'), ('PARTNER', 'VIEWER'),
        ('MANAGER', 'BUYER'),   ('MANAGER', 'WAREHOUSE_KEEPER'),
        ('MANAGER', 'SALES_REP'), ('MANAGER', 'VIEWER')
      ON CONFLICT DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "authz"."role_delegation_rules"`);
    await queryRunner.query(`DELETE FROM "authz"."role_action_grants"`);
    await queryRunner.query(`DELETE FROM "authz"."roles"`);
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class RbacDbDriven1774218189530 implements MigrationInterface {
  name = 'RbacDbDriven1774218189530';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── 1. CREATE authz tables ──────────────────────────────────────────────

    await queryRunner.query(`
      CREATE TABLE "authz"."roles" (
        "key" character varying(30) NOT NULL,
        "name_en" character varying(100) NOT NULL,
        "name_es" character varying(100) NOT NULL,
        "description" text,
        "hierarchy_level" smallint NOT NULL,
        "is_system" boolean NOT NULL DEFAULT true,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_authz_roles" PRIMARY KEY ("key")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "authz"."role_action_grants" (
        "role_key" character varying(30) NOT NULL,
        "action_key" character varying(100) NOT NULL,
        CONSTRAINT "PK_authz_role_action_grants" PRIMARY KEY ("role_key", "action_key"),
        CONSTRAINT "FK_rag_role_key" FOREIGN KEY ("role_key")
          REFERENCES "authz"."roles"("key") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "authz"."role_delegation_rules" (
        "inviter_role_key" character varying(30) NOT NULL,
        "target_role_key" character varying(30) NOT NULL,
        CONSTRAINT "PK_authz_role_delegation_rules" PRIMARY KEY ("inviter_role_key", "target_role_key"),
        CONSTRAINT "FK_rdr_inviter_role" FOREIGN KEY ("inviter_role_key")
          REFERENCES "authz"."roles"("key") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_rdr_target_role" FOREIGN KEY ("target_role_key")
          REFERENCES "authz"."roles"("key") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "authz"."user_permission_grants" (
        "id" SERIAL NOT NULL,
        "tenant_id" integer NOT NULL,
        "user_id" integer NOT NULL,
        "action_key" character varying(100) NOT NULL,
        "granted_by" integer NOT NULL,
        "granted_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "revoked_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_authz_user_permission_grants" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_upg_active_grant"
        ON "authz"."user_permission_grants" ("tenant_id", "user_id", "action_key")
        WHERE "revoked_at" IS NULL
    `);

    await queryRunner.query(`
      CREATE TABLE "authz"."role_change_log" (
        "id" SERIAL NOT NULL,
        "tenant_id" integer NOT NULL,
        "user_id" integer NOT NULL,
        "previous_role" character varying(30) NOT NULL,
        "new_role" character varying(30) NOT NULL,
        "changed_by" integer NOT NULL,
        "reason" text,
        "changed_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_authz_role_change_log" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "authz"."permission_grant_log" (
        "id" SERIAL NOT NULL,
        "tenant_id" integer NOT NULL,
        "user_id" integer NOT NULL,
        "action_key" character varying(100) NOT NULL,
        "event_type" character varying(20) NOT NULL,
        "performed_by" integer NOT NULL,
        "occurred_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_authz_permission_grant_log" PRIMARY KEY ("id")
      )
    `);

    // ── 2. ALTER tiers.tier_plans — add new columns ─────────────────────────

    await queryRunner.query(`
      ALTER TABLE "tiers"."tier_plans"
        ADD COLUMN "tier_order" smallint,
        ADD COLUMN "max_custom_rooms" integer NOT NULL DEFAULT 0,
        ADD COLUMN "max_store_rooms" integer NOT NULL DEFAULT 0,
        ADD COLUMN "invitations_enabled" boolean NOT NULL DEFAULT false,
        ADD COLUMN "advanced_reports_enabled" boolean NOT NULL DEFAULT false
    `);

    // ── 3. SEED authz.roles ─────────────────────────────────────────────────

    await queryRunner.query(`
      INSERT INTO "authz"."roles" ("key", "name_en", "name_es", "description", "hierarchy_level", "is_system")
      VALUES
        ('OWNER', 'Owner', 'Dueño', 'Business owner. One per tenant, immovable.', 1, true),
        ('PARTNER', 'Partner', 'Socio', 'Co-administrator with almost all permissions.', 2, true),
        ('MANAGER', 'Manager', 'Gerente', 'Operations management without user management.', 3, true),
        ('BUYER', 'Buyer', 'Comprador', 'Stock replenishment. No sales or financial reports.', 4, true),
        ('WAREHOUSE_KEEPER', 'Warehouse Keeper', 'Almacenista', 'Physical inventory control. No prices or reports.', 5, true),
        ('SALES_REP', 'Sales Rep', 'Vendedor', 'Sales operations. No purchases or management.', 6, true),
        ('VIEWER', 'Viewer', 'Auditor', 'Read-only access.', 7, true)
    `);

    // ── 4. SEED authz.role_action_grants ────────────────────────────────────
    // Generated from ROLE_ALLOWED_ACTIONS in tier-policy.config.ts

    // OWNER: all 17 actions
    await queryRunner.query(`
      INSERT INTO "authz"."role_action_grants" ("role_key", "action_key") VALUES
        ('OWNER', 'STORAGE_CREATE'),
        ('OWNER', 'STORAGE_READ'),
        ('OWNER', 'STORAGE_UPDATE'),
        ('OWNER', 'STORAGE_DELETE'),
        ('OWNER', 'MEMBER_INVITE'),
        ('OWNER', 'MEMBER_READ'),
        ('OWNER', 'MEMBER_UPDATE_ROLE'),
        ('OWNER', 'MEMBER_REMOVE'),
        ('OWNER', 'PRODUCT_CREATE'),
        ('OWNER', 'PRODUCT_READ'),
        ('OWNER', 'PRODUCT_UPDATE'),
        ('OWNER', 'PRODUCT_DELETE'),
        ('OWNER', 'REPORT_READ'),
        ('OWNER', 'REPORT_ADVANCED'),
        ('OWNER', 'INVENTORY_EXPORT'),
        ('OWNER', 'TENANT_SETTINGS_READ'),
        ('OWNER', 'TENANT_SETTINGS_UPDATE')
    `);

    // PARTNER: 16 actions (all except TENANT_SETTINGS_UPDATE)
    await queryRunner.query(`
      INSERT INTO "authz"."role_action_grants" ("role_key", "action_key") VALUES
        ('PARTNER', 'STORAGE_CREATE'),
        ('PARTNER', 'STORAGE_READ'),
        ('PARTNER', 'STORAGE_UPDATE'),
        ('PARTNER', 'STORAGE_DELETE'),
        ('PARTNER', 'MEMBER_INVITE'),
        ('PARTNER', 'MEMBER_READ'),
        ('PARTNER', 'MEMBER_UPDATE_ROLE'),
        ('PARTNER', 'MEMBER_REMOVE'),
        ('PARTNER', 'PRODUCT_CREATE'),
        ('PARTNER', 'PRODUCT_READ'),
        ('PARTNER', 'PRODUCT_UPDATE'),
        ('PARTNER', 'PRODUCT_DELETE'),
        ('PARTNER', 'REPORT_READ'),
        ('PARTNER', 'REPORT_ADVANCED'),
        ('PARTNER', 'INVENTORY_EXPORT'),
        ('PARTNER', 'TENANT_SETTINGS_READ')
    `);

    // MANAGER: 14 actions
    await queryRunner.query(`
      INSERT INTO "authz"."role_action_grants" ("role_key", "action_key") VALUES
        ('MANAGER', 'STORAGE_CREATE'),
        ('MANAGER', 'STORAGE_READ'),
        ('MANAGER', 'STORAGE_UPDATE'),
        ('MANAGER', 'STORAGE_DELETE'),
        ('MANAGER', 'MEMBER_INVITE'),
        ('MANAGER', 'MEMBER_READ'),
        ('MANAGER', 'PRODUCT_CREATE'),
        ('MANAGER', 'PRODUCT_READ'),
        ('MANAGER', 'PRODUCT_UPDATE'),
        ('MANAGER', 'PRODUCT_DELETE'),
        ('MANAGER', 'REPORT_READ'),
        ('MANAGER', 'REPORT_ADVANCED'),
        ('MANAGER', 'INVENTORY_EXPORT'),
        ('MANAGER', 'TENANT_SETTINGS_READ')
    `);

    // BUYER: 5 actions
    await queryRunner.query(`
      INSERT INTO "authz"."role_action_grants" ("role_key", "action_key") VALUES
        ('BUYER', 'PRODUCT_CREATE'),
        ('BUYER', 'PRODUCT_READ'),
        ('BUYER', 'PRODUCT_UPDATE'),
        ('BUYER', 'REPORT_READ'),
        ('BUYER', 'TENANT_SETTINGS_READ')
    `);

    // WAREHOUSE_KEEPER: 7 actions
    await queryRunner.query(`
      INSERT INTO "authz"."role_action_grants" ("role_key", "action_key") VALUES
        ('WAREHOUSE_KEEPER', 'STORAGE_READ'),
        ('WAREHOUSE_KEEPER', 'STORAGE_UPDATE'),
        ('WAREHOUSE_KEEPER', 'PRODUCT_READ'),
        ('WAREHOUSE_KEEPER', 'PRODUCT_UPDATE'),
        ('WAREHOUSE_KEEPER', 'INVENTORY_EXPORT'),
        ('WAREHOUSE_KEEPER', 'REPORT_READ'),
        ('WAREHOUSE_KEEPER', 'TENANT_SETTINGS_READ')
    `);

    // SALES_REP: 3 actions
    await queryRunner.query(`
      INSERT INTO "authz"."role_action_grants" ("role_key", "action_key") VALUES
        ('SALES_REP', 'PRODUCT_READ'),
        ('SALES_REP', 'REPORT_READ'),
        ('SALES_REP', 'TENANT_SETTINGS_READ')
    `);

    // VIEWER: 5 actions
    await queryRunner.query(`
      INSERT INTO "authz"."role_action_grants" ("role_key", "action_key") VALUES
        ('VIEWER', 'STORAGE_READ'),
        ('VIEWER', 'MEMBER_READ'),
        ('VIEWER', 'PRODUCT_READ'),
        ('VIEWER', 'REPORT_READ'),
        ('VIEWER', 'TENANT_SETTINGS_READ')
    `);

    // ── 5. SEED authz.role_delegation_rules ─────────────────────────────────
    // Generated from ASSIGNABLE_ROLES in role-hierarchy.service.ts

    await queryRunner.query(`
      INSERT INTO "authz"."role_delegation_rules" ("inviter_role_key", "target_role_key") VALUES
        ('OWNER', 'PARTNER'),
        ('OWNER', 'MANAGER'),
        ('OWNER', 'BUYER'),
        ('OWNER', 'WAREHOUSE_KEEPER'),
        ('OWNER', 'SALES_REP'),
        ('OWNER', 'VIEWER'),
        ('PARTNER', 'MANAGER'),
        ('PARTNER', 'BUYER'),
        ('PARTNER', 'WAREHOUSE_KEEPER'),
        ('PARTNER', 'SALES_REP'),
        ('PARTNER', 'VIEWER'),
        ('MANAGER', 'BUYER'),
        ('MANAGER', 'WAREHOUSE_KEEPER'),
        ('MANAGER', 'SALES_REP'),
        ('MANAGER', 'VIEWER')
    `);

    // ── 6. UPDATE tiers.tier_plans with new column values ───────────────────
    // Generated from TIER_ORDER and TIER_LIMITS_CONFIG

    await queryRunner.query(`
      UPDATE "tiers"."tier_plans" SET
        "tier_order" = 0,
        "max_custom_rooms" = 1,
        "max_store_rooms" = 1,
        "invitations_enabled" = false,
        "advanced_reports_enabled" = false
      WHERE "tier" = 'FREE'
    `);

    await queryRunner.query(`
      UPDATE "tiers"."tier_plans" SET
        "tier_order" = 1,
        "max_custom_rooms" = 3,
        "max_store_rooms" = 3,
        "invitations_enabled" = true,
        "advanced_reports_enabled" = false
      WHERE "tier" = 'STARTER'
    `);

    await queryRunner.query(`
      UPDATE "tiers"."tier_plans" SET
        "tier_order" = 2,
        "max_custom_rooms" = 10,
        "max_store_rooms" = 10,
        "invitations_enabled" = true,
        "advanced_reports_enabled" = true
      WHERE "tier" = 'GROWTH'
    `);

    await queryRunner.query(`
      UPDATE "tiers"."tier_plans" SET
        "tier_order" = 3,
        "max_custom_rooms" = -1,
        "max_store_rooms" = -1,
        "invitations_enabled" = true,
        "advanced_reports_enabled" = true
      WHERE "tier" = 'ENTERPRISE'
    `);

    // ── 7. ADD FKs on tenant_members.role and tenant_invitations.role ───────

    await queryRunner.query(`
      ALTER TABLE "tenants"."tenant_members"
        ADD CONSTRAINT "FK_tenant_members_role"
        FOREIGN KEY ("role") REFERENCES "authz"."roles"("key")
        ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "tenants"."tenant_invitations"
        ADD CONSTRAINT "FK_tenant_invitations_role"
        FOREIGN KEY ("role") REFERENCES "authz"."roles"("key")
        ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ── Remove FKs ──────────────────────────────────────────────────────────

    await queryRunner.query(`
      ALTER TABLE "tenants"."tenant_invitations" DROP CONSTRAINT "FK_tenant_invitations_role"
    `);

    await queryRunner.query(`
      ALTER TABLE "tenants"."tenant_members" DROP CONSTRAINT "FK_tenant_members_role"
    `);

    // ── Revert tier_plans columns ───────────────────────────────────────────

    await queryRunner.query(`
      ALTER TABLE "tiers"."tier_plans"
        DROP COLUMN "advanced_reports_enabled",
        DROP COLUMN "invitations_enabled",
        DROP COLUMN "max_store_rooms",
        DROP COLUMN "max_custom_rooms",
        DROP COLUMN "tier_order"
    `);

    // ── Drop authz tables (reverse order) ───────────────────────────────────

    await queryRunner.query(`DROP TABLE "authz"."permission_grant_log"`);
    await queryRunner.query(`DROP TABLE "authz"."role_change_log"`);
    await queryRunner.query(`DROP INDEX "authz"."IDX_upg_active_grant"`);
    await queryRunner.query(`DROP TABLE "authz"."user_permission_grants"`);
    await queryRunner.query(`DROP TABLE "authz"."role_delegation_rules"`);
    await queryRunner.query(`DROP TABLE "authz"."role_action_grants"`);
    await queryRunner.query(`DROP TABLE "authz"."roles"`);
  }
}

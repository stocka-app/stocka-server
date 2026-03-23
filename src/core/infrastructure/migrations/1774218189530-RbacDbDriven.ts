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

    // ── 3. ADD FKs on tenant_members.role and tenant_invitations.role ───────
    // Seed data (roles, grants, delegation rules) lives in seeds/

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

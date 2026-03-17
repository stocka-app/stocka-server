import { MigrationInterface, QueryRunner } from 'typeorm';

export class TenantBC1776000000000 implements MigrationInterface {
  name = 'TenantBC1776000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // -------------------------------------------------------------------------
    // tenants — Tenant Aggregate anchor
    // -------------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "tenants" (
        "id"            SERIAL                   NOT NULL,
        "uuid"          uuid                     NOT NULL,
        "name"          character varying(150)   NOT NULL,
        "slug"          character varying(100)   NOT NULL,
        "business_type" character varying(50)    NOT NULL,
        "country"       character(2)             NOT NULL DEFAULT 'MX',
        "timezone"      character varying(60)    NOT NULL DEFAULT 'America/Mexico_City',
        "status"        character varying(20)    NOT NULL DEFAULT 'active',
        "owner_user_id" integer                  NOT NULL,
        "created_at"    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at"    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "archived_at"   TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "UQ_tenants_uuid" UNIQUE ("uuid"),
        CONSTRAINT "UQ_tenants_slug" UNIQUE ("slug"),
        CONSTRAINT "PK_tenants"     PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_tenants_status" ON "tenants" ("status")`);
    await queryRunner.query(
      `CREATE INDEX "IDX_tenants_owner_user_id" ON "tenants" ("owner_user_id")`,
    );

    // -------------------------------------------------------------------------
    // tenant_members — membership link (N:1 with tenants, N:1 with users)
    // -------------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "tenant_members" (
        "id"          SERIAL                   NOT NULL,
        "uuid"        uuid                     NOT NULL,
        "tenant_id"   integer                  NOT NULL,
        "user_id"     integer                  NOT NULL,
        "user_uuid"   uuid                     NOT NULL,
        "role"        character varying(30)    NOT NULL,
        "status"      character varying(20)    NOT NULL DEFAULT 'active',
        "invited_by"  integer,
        "joined_at"   TIMESTAMP WITH TIME ZONE,
        "created_at"  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at"  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "archived_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "UQ_tenant_members_uuid"           UNIQUE ("uuid"),
        CONSTRAINT "UQ_tenant_members_tenant_user"    UNIQUE ("tenant_id", "user_id"),
        CONSTRAINT "PK_tenant_members"                PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_tenant_members_tenant_id" ON "tenant_members" ("tenant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_tenant_members_user_uuid" ON "tenant_members" ("user_uuid")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_tenant_members_status" ON "tenant_members" ("status")`,
    );

    // -------------------------------------------------------------------------
    // tenant_profiles — contact/display info (1:1 with tenants)
    // -------------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "tenant_profiles" (
        "id"            SERIAL                   NOT NULL,
        "uuid"          uuid                     NOT NULL,
        "tenant_id"     integer                  NOT NULL,
        "giro"          character varying(100),
        "phone"         character varying(30),
        "contact_email" character varying(255),
        "website"       character varying(500),
        "address_line1" character varying(200),
        "city"          character varying(100),
        "state"         character varying(100),
        "postal_code"   character varying(20),
        "logo_url"      character varying(500),
        "created_at"    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at"    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "archived_at"   TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "UQ_tenant_profiles_uuid"      UNIQUE ("uuid"),
        CONSTRAINT "UQ_tenant_profiles_tenant_id" UNIQUE ("tenant_id"),
        CONSTRAINT "PK_tenant_profiles"           PRIMARY KEY ("id")
      )
    `);

    // -------------------------------------------------------------------------
    // tenant_config — tier and limits (1:1 with tenants)
    // -------------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "tenant_config" (
        "id"                    SERIAL                   NOT NULL,
        "uuid"                  uuid                     NOT NULL,
        "tenant_id"             integer                  NOT NULL,
        "tier"                  character varying(20)    NOT NULL DEFAULT 'FREE',
        "max_warehouses"        integer                  NOT NULL DEFAULT 0,
        "max_users"             integer                  NOT NULL DEFAULT 1,
        "max_products"          integer                  NOT NULL DEFAULT 100,
        "notifications_enabled" boolean                  NOT NULL DEFAULT true,
        "created_at"            TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at"            TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "archived_at"           TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "UQ_tenant_config_uuid"      UNIQUE ("uuid"),
        CONSTRAINT "UQ_tenant_config_tenant_id" UNIQUE ("tenant_id"),
        CONSTRAINT "PK_tenant_config"           PRIMARY KEY ("id")
      )
    `);

    // =========================================================================
    // Foreign Key Constraints
    // =========================================================================

    // tenants → users (owner)
    await queryRunner.query(`
      ALTER TABLE "tenants"
        ADD CONSTRAINT "FK_tenants_owner_user_id"
        FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
    `);

    // tenant_members → tenants
    await queryRunner.query(`
      ALTER TABLE "tenant_members"
        ADD CONSTRAINT "FK_tenant_members_tenant_id"
        FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // tenant_members → users
    await queryRunner.query(`
      ALTER TABLE "tenant_members"
        ADD CONSTRAINT "FK_tenant_members_user_id"
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // tenant_members.invited_by → users (nullable)
    await queryRunner.query(`
      ALTER TABLE "tenant_members"
        ADD CONSTRAINT "FK_tenant_members_invited_by"
        FOREIGN KEY ("invited_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    // tenant_profiles → tenants
    await queryRunner.query(`
      ALTER TABLE "tenant_profiles"
        ADD CONSTRAINT "FK_tenant_profiles_tenant_id"
        FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // tenant_config → tenants
    await queryRunner.query(`
      ALTER TABLE "tenant_config"
        ADD CONSTRAINT "FK_tenant_config_tenant_id"
        FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop FK constraints first (reverse order)
    await queryRunner.query(
      `ALTER TABLE "tenant_config"   DROP CONSTRAINT "FK_tenant_config_tenant_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenant_profiles" DROP CONSTRAINT "FK_tenant_profiles_tenant_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenant_members"  DROP CONSTRAINT "FK_tenant_members_invited_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenant_members"  DROP CONSTRAINT "FK_tenant_members_user_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenant_members"  DROP CONSTRAINT "FK_tenant_members_tenant_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenants"         DROP CONSTRAINT "FK_tenants_owner_user_id"`,
    );

    // Drop indexes
    await queryRunner.query(`DROP INDEX "public"."IDX_tenant_members_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_tenant_members_user_uuid"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_tenant_members_tenant_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_tenants_owner_user_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_tenants_status"`);

    // Drop tables in reverse dependency order
    await queryRunner.query(`DROP TABLE "tenant_config"`);
    await queryRunner.query(`DROP TABLE "tenant_profiles"`);
    await queryRunner.query(`DROP TABLE "tenant_members"`);
    await queryRunner.query(`DROP TABLE "tenants"`);
  }
}

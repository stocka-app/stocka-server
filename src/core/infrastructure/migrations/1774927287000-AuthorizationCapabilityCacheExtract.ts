import { MigrationInterface, QueryRunner } from 'typeorm';

export class AuthorizationCapabilityCacheExtract1774927287000 implements MigrationInterface {
  name = 'AuthorizationCapabilityCacheExtract1774927287000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create the capability_cache table in the authz schema
    await queryRunner.query(`
      CREATE TABLE "authz"."capability_cache" (
        "tenant_id" integer NOT NULL,
        "capabilities" jsonb DEFAULT null,
        "capabilities_built_at" TIMESTAMP WITH TIME ZONE DEFAULT null,
        CONSTRAINT "PK_capability_cache_tenant_id" PRIMARY KEY ("tenant_id")
      )
    `);

    // Migrate existing data from tenants.tenant_config into authz.capability_cache
    await queryRunner.query(`
      INSERT INTO "authz"."capability_cache" ("tenant_id", "capabilities", "capabilities_built_at")
      SELECT "tenant_id", "capabilities", "capabilities_built_at"
      FROM "tenants"."tenant_config"
      WHERE "capabilities" IS NOT NULL
    `);

    // Drop the columns from tenants.tenant_config
    await queryRunner.query(`ALTER TABLE "tenants"."tenant_config" DROP COLUMN "capabilities"`);
    await queryRunner.query(
      `ALTER TABLE "tenants"."tenant_config" DROP COLUMN "capabilities_built_at"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Re-add the columns to tenants.tenant_config
    await queryRunner.query(
      `ALTER TABLE "tenants"."tenant_config" ADD "capabilities" jsonb DEFAULT null`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenants"."tenant_config" ADD "capabilities_built_at" TIMESTAMP WITH TIME ZONE DEFAULT null`,
    );

    // Migrate data back from authz.capability_cache into tenants.tenant_config
    await queryRunner.query(`
      UPDATE "tenants"."tenant_config" tc
      SET "capabilities" = cc."capabilities",
          "capabilities_built_at" = cc."capabilities_built_at"
      FROM "authz"."capability_cache" cc
      WHERE tc."tenant_id" = cc."tenant_id"
    `);

    // Drop the capability_cache table
    await queryRunner.query(`DROP TABLE "authz"."capability_cache"`);
  }
}

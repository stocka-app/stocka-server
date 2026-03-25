import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedCatalogActionsAndAddFks1774236551194 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Seed data (modules, catalog_actions) lives in seeds/

    // ── 1. Add FK: role_action_grants.action_key → catalog_actions.key ────────
    await queryRunner.query(`
      ALTER TABLE "authz"."role_action_grants"
        ADD CONSTRAINT "FK_rag_action_key"
        FOREIGN KEY ("action_key") REFERENCES "capabilities"."catalog_actions"("key")
        ON DELETE CASCADE ON UPDATE CASCADE
    `);

    // ── 2. Add FK: user_permission_grants.action_key → catalog_actions.key ────
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

    // Seed data is reverted by seed:revert
  }
}

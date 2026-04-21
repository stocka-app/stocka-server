import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds STORAGE_RESTORE as a separate RBAC action and grants it to OWNER and
 * PARTNER. Manager is intentionally excluded (read-only on the storage module).
 *
 * Complements the seed files SeedCapabilities and SeedRbacRoles for databases
 * that already ran the original seeds and won't pick up the new action on
 * seed re-run (TypeORM tracks executed migrations and won't re-run them).
 */
export class SeedStorageRestoreAction1776300000000 implements MigrationInterface {
  name = 'SeedStorageRestoreAction1776300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Insert the new STORAGE_RESTORE action into the catalog.
    // Guard: only insert when the STORAGE module row exists (seeds have already run).
    await queryRunner.query(`
      INSERT INTO "capabilities"."catalog_actions" ("module_id", "key", "name", "action_type", "is_active")
      SELECT
        m.id,
        'STORAGE_RESTORE',
        'Restore Storage',
        'WRITE',
        true
      FROM "capabilities"."modules" m
      WHERE m."key" = 'STORAGE'
      ON CONFLICT ("key") DO NOTHING
    `);

    // Grant STORAGE_RESTORE to OWNER and PARTNER.
    // Guard: only insert grants when the action row actually exists (fresh DB: seeds handle this).
    await queryRunner.query(`
      INSERT INTO "authz"."role_action_grants" ("role_key", "action_key")
      SELECT r.role_key, 'STORAGE_RESTORE'
      FROM (VALUES ('OWNER'), ('PARTNER')) AS r(role_key)
      WHERE EXISTS (
        SELECT 1 FROM "capabilities"."catalog_actions" WHERE "key" = 'STORAGE_RESTORE'
      )
      ON CONFLICT DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "authz"."role_action_grants"
      WHERE "action_key" = 'STORAGE_RESTORE'
    `);

    await queryRunner.query(`
      DELETE FROM "capabilities"."catalog_actions"
      WHERE "key" = 'STORAGE_RESTORE'
    `);
  }
}

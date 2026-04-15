import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * H-07 Archivar instalación — STOC-400
 *
 * Adds STORAGE_RESTORE as a separate RBAC action (paralelo a STORAGE_UNFREEZE
 * de H-05). Grants it to OWNER and PARTNER. MANAGER intentionally excluded —
 * per EC-01 / H-04 / H-07, Manager is read-only on the storage module.
 *
 * STORAGE_DELETE already exists in the catalog (used historically for the
 * archive endpoint of H-05). H-07 reserves it for the upcoming permanent
 * delete flow (separate historia), so no new grant changes here.
 *
 * This migration complements the seed file changes in SeedCapabilities and
 * SeedRbacRoles. It exists because existing databases that already ran the
 * original seeds won't pick up the new action on seed re-run (TypeORM
 * tracks executed migrations and won't re-run them).
 */
export class SeedH07RestoreAction1776300000000 implements MigrationInterface {
  name = 'SeedH07RestoreAction1776300000000';

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

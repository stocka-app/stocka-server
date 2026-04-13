import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * H-05 Congelar instalación — STOC-356
 *
 * Adds STORAGE_UNFREEZE as a separate RBAC action (ADR D-3, D-18).
 * Grants it to OWNER and PARTNER (same roles as STORAGE_FREEZE in Sprint 2).
 * MANAGER intentionally excluded — per EC-01/H-04, Manager is read-only.
 *
 * This migration complements the seed file changes in SeedCapabilities and
 * SeedRbacRoles. It exists because existing databases that already ran the
 * original seeds won't pick up the new action on seed re-run (TypeORM
 * tracks executed migrations and won't re-run them).
 */
export class SeedStorageUnfreezeAction1776067516412 implements MigrationInterface {
  name = 'SeedStorageUnfreezeAction1776067516412';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Insert the new STORAGE_UNFREEZE action into the catalog.
    // Guard: only insert when the STORAGE module row exists (i.e. seeds have already run).
    // On a fresh database the SeedCapabilities seed inserts this row, so no action is needed.
    await queryRunner.query(`
      INSERT INTO "capabilities"."catalog_actions" ("module_id", "key", "name", "action_type", "is_active")
      SELECT
        m.id,
        'STORAGE_UNFREEZE',
        'Unfreeze Storage',
        'WRITE',
        true
      FROM "capabilities"."modules" m
      WHERE m."key" = 'STORAGE'
      ON CONFLICT ("key") DO NOTHING
    `);

    // Grant STORAGE_UNFREEZE to OWNER and PARTNER.
    // Guard: only insert grants when the action row actually exists (fresh DB: seeds handle this).
    await queryRunner.query(`
      INSERT INTO "authz"."role_action_grants" ("role_key", "action_key")
      SELECT r.role_key, 'STORAGE_UNFREEZE'
      FROM (VALUES ('OWNER'), ('PARTNER')) AS r(role_key)
      WHERE EXISTS (
        SELECT 1 FROM "capabilities"."catalog_actions" WHERE "key" = 'STORAGE_UNFREEZE'
      )
      ON CONFLICT DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "authz"."role_action_grants"
      WHERE "action_key" = 'STORAGE_UNFREEZE'
    `);

    await queryRunner.query(`
      DELETE FROM "capabilities"."catalog_actions"
      WHERE "key" = 'STORAGE_UNFREEZE'
    `);
  }
}

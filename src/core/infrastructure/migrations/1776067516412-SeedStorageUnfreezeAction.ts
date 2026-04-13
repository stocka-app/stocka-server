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
    // Insert the new STORAGE_UNFREEZE action into the catalog
    await queryRunner.query(`
      INSERT INTO "capabilities"."catalog_actions" ("module_id", "key", "name", "action_type", "is_active")
      VALUES (
        (SELECT id FROM "capabilities"."modules" WHERE "key" = 'STORAGE'),
        'STORAGE_UNFREEZE',
        'Unfreeze Storage',
        'WRITE',
        true
      )
      ON CONFLICT ("key") DO NOTHING
    `);

    // Grant STORAGE_UNFREEZE to OWNER and PARTNER
    await queryRunner.query(`
      INSERT INTO "authz"."role_action_grants" ("role_key", "action_key")
      VALUES
        ('OWNER', 'STORAGE_UNFREEZE'),
        ('PARTNER', 'STORAGE_UNFREEZE')
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

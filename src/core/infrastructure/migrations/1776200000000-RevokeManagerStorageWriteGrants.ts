import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * DT-H05-4/5/6: Per EC-01 RBAC matrix, MANAGER is read-only in the storage
 * module (STORAGE_READ only). This migration revokes the write grants that
 * were seeded incorrectly during Sprint 2.
 */
export class RevokeManagerStorageWriteGrants1776200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "authz"."role_action_grants"
      WHERE "role_key" = 'MANAGER'
        AND "action_key" IN (
          'STORAGE_CREATE',
          'STORAGE_UPDATE',
          'STORAGE_DELETE',
          'STORAGE_FREEZE',
          'STORAGE_ARCHIVE'
        )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "authz"."role_action_grants" ("role_key", "action_key") VALUES
        ('MANAGER', 'STORAGE_CREATE'),
        ('MANAGER', 'STORAGE_UPDATE'),
        ('MANAGER', 'STORAGE_DELETE'),
        ('MANAGER', 'STORAGE_FREEZE'),
        ('MANAGER', 'STORAGE_ARCHIVE')
      ON CONFLICT DO NOTHING
    `);
  }
}

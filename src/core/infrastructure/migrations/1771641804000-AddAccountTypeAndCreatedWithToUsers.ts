import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAccountTypeAndCreatedWithToUsers1771641804000 implements MigrationInterface {
  name = 'AddAccountTypeAndCreatedWithToUsers1771641804000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add created_with column (immutable, set at account creation)
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN "created_with" character varying(20) NOT NULL DEFAULT 'email'`,
    );

    // Add account_type column (mutable, reflects current auth methods)
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN "account_type" character varying(10) NOT NULL DEFAULT 'manual'`,
    );

    // Backfill: users that have social_accounts are social or flexible
    await queryRunner.query(`
      UPDATE "users" u
      SET
        "created_with" = (
          SELECT sa.provider
          FROM "social_accounts" sa
          WHERE sa.user_id = u.id AND sa.archived_at IS NULL
          ORDER BY sa.created_at ASC
          LIMIT 1
        ),
        "account_type" = CASE
          WHEN u.password_hash IS NOT NULL THEN 'flexible'
          ELSE 'social'
        END
      WHERE EXISTS (
        SELECT 1 FROM "social_accounts" sa
        WHERE sa.user_id = u.id AND sa.archived_at IS NULL
      )
    `);

    // Indexes for frequent queries
    await queryRunner.query(
      `CREATE INDEX "IDX_users_account_type" ON "users" ("account_type")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_users_created_with" ON "users" ("created_with")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_users_created_with"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_users_account_type"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "account_type"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "created_with"`);
  }
}

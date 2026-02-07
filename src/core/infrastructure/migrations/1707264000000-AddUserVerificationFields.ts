import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserVerificationFields1707264000000 implements MigrationInterface {
  name = 'AddUserVerificationFields1707264000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add status column to users table
    await queryRunner.query(`
      ALTER TABLE users
      ADD COLUMN status VARCHAR(30) NOT NULL DEFAULT 'pending_verification'
    `);

    // Add email_verified_at column
    await queryRunner.query(`
      ALTER TABLE users
      ADD COLUMN email_verified_at TIMESTAMPTZ NULL
    `);

    // Add verification_blocked_until column
    await queryRunner.query(`
      ALTER TABLE users
      ADD COLUMN verification_blocked_until TIMESTAMPTZ NULL
    `);

    // Create index on status for faster queries
    await queryRunner.query(`
      CREATE INDEX idx_users_status ON users(status)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_users_status`);
    await queryRunner.query(`ALTER TABLE users DROP COLUMN IF EXISTS verification_blocked_until`);
    await queryRunner.query(`ALTER TABLE users DROP COLUMN IF EXISTS email_verified_at`);
    await queryRunner.query(`ALTER TABLE users DROP COLUMN IF EXISTS status`);
  }
}

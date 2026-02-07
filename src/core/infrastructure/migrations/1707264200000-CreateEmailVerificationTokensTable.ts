import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEmailVerificationTokensTable1707264200000 implements MigrationInterface {
  name = 'CreateEmailVerificationTokensTable1707264200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE email_verification_tokens (
        id SERIAL PRIMARY KEY,
        uuid UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        code_hash VARCHAR(128) NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        used_at TIMESTAMPTZ NULL,
        resend_count INTEGER DEFAULT 0,
        last_resent_at TIMESTAMPTZ NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        archived_at TIMESTAMPTZ NULL
      )
    `);

    // Index for faster user lookups
    await queryRunner.query(`
      CREATE INDEX idx_evt_user_id ON email_verification_tokens(user_id)
    `);

    // Index for finding active (non-expired, non-used) tokens
    await queryRunner.query(`
      CREATE INDEX idx_evt_expires_at ON email_verification_tokens(expires_at)
      WHERE used_at IS NULL AND archived_at IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_evt_expires_at`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_evt_user_id`);
    await queryRunner.query(`DROP TABLE IF EXISTS email_verification_tokens`);
  }
}

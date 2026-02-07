import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateVerificationAttemptsTable1707264300000 implements MigrationInterface {
  name = 'CreateVerificationAttemptsTable1707264300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE verification_attempts (
        id SERIAL PRIMARY KEY,
        uuid UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
        user_uuid VARCHAR(36) NOT NULL,
        email VARCHAR(255) NOT NULL,
        ip_address INET NOT NULL,
        user_agent TEXT,
        code_entered VARCHAR(10) NOT NULL,
        success BOOLEAN NOT NULL DEFAULT FALSE,
        verification_type VARCHAR(30) NOT NULL DEFAULT 'email_verification',
        attempted_at TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        archived_at TIMESTAMPTZ NULL
      )
    `);

    // Index for rate limiting by IP
    await queryRunner.query(`
      CREATE INDEX idx_va_ip_address ON verification_attempts(ip_address)
    `);

    // Index for rate limiting by email
    await queryRunner.query(`
      CREATE INDEX idx_va_email ON verification_attempts(email)
    `);

    // Index for time-based queries (rate limiting windows)
    await queryRunner.query(`
      CREATE INDEX idx_va_attempted_at ON verification_attempts(attempted_at)
    `);

    // Composite index for user failed attempts lookup
    await queryRunner.query(`
      CREATE INDEX idx_va_user_attempts ON verification_attempts(user_uuid, attempted_at)
      WHERE success = FALSE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_va_user_attempts`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_va_attempted_at`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_va_email`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_va_ip_address`);
    await queryRunner.query(`DROP TABLE IF EXISTS verification_attempts`);
  }
}

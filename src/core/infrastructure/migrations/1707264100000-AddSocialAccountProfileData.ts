import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSocialAccountProfileData1707264100000 implements MigrationInterface {
  name = 'AddSocialAccountProfileData1707264100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add profile_data JSONB column for storing provider-specific data
    await queryRunner.query(`
      ALTER TABLE social_accounts
      ADD COLUMN profile_data JSONB NULL
    `);

    // Add encrypted access token storage
    await queryRunner.query(`
      ALTER TABLE social_accounts
      ADD COLUMN access_token_encrypted TEXT NULL
    `);

    // Add encrypted refresh token storage
    await queryRunner.query(`
      ALTER TABLE social_accounts
      ADD COLUMN refresh_token_encrypted TEXT NULL
    `);

    // Add token expiration timestamp
    await queryRunner.query(`
      ALTER TABLE social_accounts
      ADD COLUMN token_expires_at TIMESTAMPTZ NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE social_accounts DROP COLUMN IF EXISTS token_expires_at`);
    await queryRunner.query(
      `ALTER TABLE social_accounts DROP COLUMN IF EXISTS refresh_token_encrypted`,
    );
    await queryRunner.query(
      `ALTER TABLE social_accounts DROP COLUMN IF EXISTS access_token_encrypted`,
    );
    await queryRunner.query(`ALTER TABLE social_accounts DROP COLUMN IF EXISTS profile_data`);
  }
}

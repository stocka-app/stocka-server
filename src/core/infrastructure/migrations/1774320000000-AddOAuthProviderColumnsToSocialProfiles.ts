import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOAuthProviderColumnsToSocialProfiles1774320000000 implements MigrationInterface {
  name = 'AddOAuthProviderColumnsToSocialProfiles1774320000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "profiles"."social_profiles" ADD "given_name" character varying(100)`,
    );
    await queryRunner.query(
      `ALTER TABLE "profiles"."social_profiles" ADD "family_name" character varying(100)`,
    );
    await queryRunner.query(
      `ALTER TABLE "profiles"."social_profiles" ADD "locale" character varying(20)`,
    );
    await queryRunner.query(
      `ALTER TABLE "profiles"."social_profiles" ADD "email_verified" boolean`,
    );
    await queryRunner.query(
      `ALTER TABLE "profiles"."social_profiles" ADD "job_title" character varying(200)`,
    );
    await queryRunner.query(`ALTER TABLE "profiles"."social_profiles" ADD "raw_data" jsonb`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "profiles"."social_profiles" DROP COLUMN "raw_data"`);
    await queryRunner.query(`ALTER TABLE "profiles"."social_profiles" DROP COLUMN "job_title"`);
    await queryRunner.query(
      `ALTER TABLE "profiles"."social_profiles" DROP COLUMN "email_verified"`,
    );
    await queryRunner.query(`ALTER TABLE "profiles"."social_profiles" DROP COLUMN "locale"`);
    await queryRunner.query(`ALTER TABLE "profiles"."social_profiles" DROP COLUMN "family_name"`);
    await queryRunner.query(`ALTER TABLE "profiles"."social_profiles" DROP COLUMN "given_name"`);
  }
}

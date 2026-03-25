import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Expands provider_avatar_url from varchar(500) to text in social_profiles.
 *
 * Microsoft Graph API does not return a photo URL — the photo endpoint returns
 * raw image bytes that must be fetched server-side and stored as a base64
 * data URI (data:image/jpeg;base64,...). A 96×96 JPEG in base64 is ~8–12 KB,
 * which exceeds the previous varchar(500) limit.
 */
export class ExpandAvatarUrlToText1774406400000 implements MigrationInterface {
  name = 'ExpandAvatarUrlToText1774406400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "profiles"."social_profiles"
       ALTER COLUMN "provider_avatar_url" TYPE text`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "profiles"."social_profiles"
       ALTER COLUMN "provider_avatar_url" TYPE character varying(500)`,
    );
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1773879984241 implements MigrationInterface {
  name = 'InitialSchema1773879984241';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "process_state" ("id" uuid NOT NULL, "process_name" character varying(100) NOT NULL, "correlation_id" character varying(255) NOT NULL, "status" character varying(20) NOT NULL DEFAULT 'started', "current_step" character varying(100) NOT NULL, "data" jsonb NOT NULL DEFAULT '{}', "error_message" text, "started_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "completed_at" TIMESTAMP WITH TIME ZONE, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_49696cec8b2f82b090c79b5f18a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_process_state_process_name" ON "process_state" ("process_name") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_process_state_correlation_id" ON "process_state" ("correlation_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_process_state_status" ON "process_state" ("status") `,
    );
    await queryRunner.query(
      `CREATE TABLE "tier_plans" ("tier" character varying(20) NOT NULL, "name" character varying(100) NOT NULL, "max_products" integer, "max_users" integer, "max_warehouses" integer DEFAULT '0', "policy_version" TIMESTAMP WITH TIME ZONE NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_0813f6d3eedfb107638262c97ec" PRIMARY KEY ("tier"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "modules" ("id" SERIAL NOT NULL, "key" character varying(100) NOT NULL, "name" character varying(200) NOT NULL, "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "UQ_a57f2b3bd9ebb022212e634f601" UNIQUE ("key"), CONSTRAINT "PK_7dbefd488bd96c5bf31f0ce0c95" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "tier_module_policies" ("tier" character varying(20) NOT NULL, "module_id" integer NOT NULL, "enabled" boolean NOT NULL DEFAULT true, "config" jsonb, CONSTRAINT "PK_882c813e0e6675a6261f311b480" PRIMARY KEY ("tier", "module_id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "credential_accounts" ("id" SERIAL NOT NULL, "uuid" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "archived_at" TIMESTAMP WITH TIME ZONE, "account_id" integer NOT NULL, "email" character varying(255) NOT NULL, "password_hash" character varying(255), "status" character varying(30) NOT NULL DEFAULT 'pending_verification', "email_verified_at" TIMESTAMP WITH TIME ZONE, "verification_blocked_until" TIMESTAMP WITH TIME ZONE, "created_with" character varying(20) NOT NULL DEFAULT 'email', CONSTRAINT "UQ_a8f0e784232e9f7bf0404c68a6c" UNIQUE ("uuid"), CONSTRAINT "UQ_ee3e3e2575dc7b27974bb860877" UNIQUE ("account_id"), CONSTRAINT "UQ_b9811916c3ba1b19722487fb753" UNIQUE ("email"), CONSTRAINT "PK_a9bb8db088f56ccc2ee6519ab2d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8a13d1aee5c999536747a967a8" ON "credential_accounts" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_dfbe65d48344a6c60eae7e453e" ON "credential_accounts" ("created_with") `,
    );
    await queryRunner.query(
      `CREATE TABLE "social_accounts" ("id" SERIAL NOT NULL, "uuid" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "archived_at" TIMESTAMP WITH TIME ZONE, "account_id" integer NOT NULL, "provider" character varying(20) NOT NULL, "provider_id" character varying(255) NOT NULL, "provider_email" character varying(255), "linked_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_2ee04e5974c7a8a47f484fcb51e" UNIQUE ("uuid"), CONSTRAINT "PK_e9e58d2d8e9fafa20af914d9750" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_411c2df970da88bd9e8c6a51ee" ON "social_accounts" ("account_id", "provider") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_244e28edb736d5184e50dff200" ON "social_accounts" ("provider", "provider_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "accounts" ("id" SERIAL NOT NULL, "uuid" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "archived_at" TIMESTAMP WITH TIME ZONE, "user_id" integer NOT NULL, CONSTRAINT "UQ_45705ce5c594e0b9f6158a43370" UNIQUE ("uuid"), CONSTRAINT "UQ_3000dad1da61b29953f07476324" UNIQUE ("user_id"), CONSTRAINT "PK_5a7a02c20412299d198e097a8fe" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "catalog_actions" ("id" SERIAL NOT NULL, "module_id" integer NOT NULL, "key" character varying(100) NOT NULL, "name" character varying(200) NOT NULL, "action_type" character varying(50) NOT NULL, "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "UQ_a40fd4a57b8ecef7aa6373a7c17" UNIQUE ("key"), CONSTRAINT "PK_7179056fb9c1c945abb0b7ba465" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "tier_action_overrides" ("tier" character varying(20) NOT NULL, "action_id" integer NOT NULL, "enabled" boolean NOT NULL, "config" jsonb, CONSTRAINT "PK_ae9205636c13a60474abf8741a4" PRIMARY KEY ("tier", "action_id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "tenants" ("id" SERIAL NOT NULL, "uuid" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "archived_at" TIMESTAMP WITH TIME ZONE, "name" character varying(150) NOT NULL, "slug" character varying(100) NOT NULL, "business_type" character varying(50) NOT NULL, "country" character(2) NOT NULL DEFAULT 'MX', "timezone" character varying(60) NOT NULL DEFAULT 'America/Mexico_City', "status" character varying(20) NOT NULL DEFAULT 'active', "owner_user_id" integer NOT NULL, CONSTRAINT "UQ_30223f2eb10f4a2684508232082" UNIQUE ("uuid"), CONSTRAINT "UQ_2310ecc5cb8be427097154b18fc" UNIQUE ("slug"), CONSTRAINT "PK_53be67a04681c66b87ee27c9321" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_2310ecc5cb8be427097154b18f" ON "tenants" ("slug") `);
    await queryRunner.query(
      `CREATE INDEX "IDX_c59559e7872bc9726adef4669f" ON "tenants" ("status") `,
    );
    await queryRunner.query(
      `CREATE TABLE "tenant_profiles" ("id" SERIAL NOT NULL, "uuid" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "archived_at" TIMESTAMP WITH TIME ZONE, "tenant_id" integer NOT NULL, "giro" character varying(100), "phone" character varying(30), "contact_email" character varying(255), "website" character varying(500), "address_line1" character varying(200), "city" character varying(100), "state" character varying(100), "postal_code" character varying(20), "logo_url" character varying(500), CONSTRAINT "UQ_1880d41048cc5c34ca8549613fc" UNIQUE ("uuid"), CONSTRAINT "UQ_7755f200fd5c61591cecffa98d0" UNIQUE ("tenant_id"), CONSTRAINT "PK_2a7607ec8fe2028dc77670f64c8" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "tenant_members" ("id" SERIAL NOT NULL, "uuid" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "archived_at" TIMESTAMP WITH TIME ZONE, "tenant_id" integer NOT NULL, "user_id" integer NOT NULL, "user_uuid" uuid NOT NULL, "role" character varying(30) NOT NULL, "status" character varying(20) NOT NULL DEFAULT 'active', "invited_by" integer, "joined_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_8bfd454bc70570e52bc1c5fee53" UNIQUE ("uuid"), CONSTRAINT "PK_f698fea03ae8f690b936971aa99" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ffba0c9ecd4fd98550b3300ae6" ON "tenant_members" ("tenant_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_45aa4b00b2400b1852516f2bdc" ON "tenant_members" ("status") `,
    );
    await queryRunner.query(
      `CREATE TABLE "tenant_config" ("id" SERIAL NOT NULL, "uuid" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "archived_at" TIMESTAMP WITH TIME ZONE, "tenant_id" integer NOT NULL, "tier" character varying(20) NOT NULL DEFAULT 'FREE', "max_warehouses" integer NOT NULL DEFAULT '0', "max_users" integer NOT NULL DEFAULT '1', "max_products" integer NOT NULL DEFAULT '100', "notifications_enabled" boolean NOT NULL DEFAULT true, "product_count" integer NOT NULL DEFAULT '0', "storage_count" integer NOT NULL DEFAULT '0', "member_count" integer NOT NULL DEFAULT '1', "capabilities" jsonb, "capabilities_built_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_aae7459f25c3269f7b733ac9233" UNIQUE ("uuid"), CONSTRAINT "UQ_2e83f909a8863ad737ad6744767" UNIQUE ("tenant_id"), CONSTRAINT "PK_1739ef7722e16d9cfe91c38d34a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "verification_attempts" ("id" SERIAL NOT NULL, "uuid" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "archived_at" TIMESTAMP WITH TIME ZONE, "user_uuid" character varying(36), "email" character varying(255), "ip_address" inet NOT NULL, "user_agent" text, "code_entered" character varying(10), "success" boolean NOT NULL DEFAULT false, "verification_type" character varying(30) NOT NULL DEFAULT 'email_verification', "attempted_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), CONSTRAINT "UQ_64c5c9651a733221f41f8bb1e5b" UNIQUE ("uuid"), CONSTRAINT "PK_2cc0cabfe71231719a23cfcdaf8" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e6470df66c7cac761f40efe6db" ON "verification_attempts" ("user_uuid") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_dd2cbbbc127b69ce5637c22270" ON "verification_attempts" ("email") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_43c10501c713ab675b9aea3d21" ON "verification_attempts" ("ip_address") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0e65969a2dc1f558d77daacb85" ON "verification_attempts" ("attempted_at") `,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" SERIAL NOT NULL, "uuid" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "archived_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_951b8f1dfc94ac1d0301a14b7e1" UNIQUE ("uuid"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "sessions" ("id" SERIAL NOT NULL, "uuid" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "archived_at" TIMESTAMP WITH TIME ZONE, "user_id" integer NOT NULL, "token_hash" character varying(128) NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "UQ_faf29798ea59ac7f07b1be6f79b" UNIQUE ("uuid"), CONSTRAINT "PK_3238ef96f18b355b671619111bc" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_abaa9e068cdd390bc5210f7988" ON "sessions" ("token_hash") `,
    );
    await queryRunner.query(
      `CREATE TABLE "password_reset_tokens" ("id" SERIAL NOT NULL, "uuid" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "archived_at" TIMESTAMP WITH TIME ZONE, "credential_account_id" integer NOT NULL, "token_hash" character varying(128) NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "used_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_573c6c232c2b7d66202cbf49d87" UNIQUE ("uuid"), CONSTRAINT "PK_d16bebd73e844c48bca50ff8d3d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_91185d86d5d7557b19abbb2868" ON "password_reset_tokens" ("token_hash") `,
    );
    await queryRunner.query(
      `CREATE TABLE "email_verification_tokens" ("id" SERIAL NOT NULL, "uuid" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "archived_at" TIMESTAMP WITH TIME ZONE, "credential_account_id" integer NOT NULL, "code_hash" character varying(128) NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "used_at" TIMESTAMP WITH TIME ZONE, "resend_count" integer NOT NULL DEFAULT '0', "last_resent_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_dbdc8cf587cd11e5895bcfa666e" UNIQUE ("uuid"), CONSTRAINT "PK_417a095bbed21c2369a6a01ab9a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d633df78199521854b2b914614" ON "email_verification_tokens" ("credential_account_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "commercial_profiles" ("id" SERIAL NOT NULL, "uuid" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "archived_at" TIMESTAMP WITH TIME ZONE, "profile_id" integer NOT NULL, "full_name" character varying(150), "phone" character varying(30), "country_code" character(2) DEFAULT 'MX', "tax_id" character varying(50), CONSTRAINT "UQ_329472a52d6fe6b45108b837ce7" UNIQUE ("uuid"), CONSTRAINT "UQ_d86aad2568685f1e00dfbdf725f" UNIQUE ("profile_id"), CONSTRAINT "PK_e59a3233dc065eba6fc836150f2" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "profiles" ("id" SERIAL NOT NULL, "uuid" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "archived_at" TIMESTAMP WITH TIME ZONE, "user_id" integer NOT NULL, CONSTRAINT "UQ_2c0c7196c89bdcc9b04f29f3fe6" UNIQUE ("uuid"), CONSTRAINT "UQ_9e432b7df0d182f8d292902d1a2" UNIQUE ("user_id"), CONSTRAINT "PK_8e520eb4da7dc01d0e190447c8e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "personal_profiles" ("id" SERIAL NOT NULL, "uuid" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "archived_at" TIMESTAMP WITH TIME ZONE, "profile_id" integer NOT NULL, "username" character varying(30) NOT NULL, "display_name" character varying(100), "avatar_url" character varying(500), "locale" character varying(10) NOT NULL DEFAULT 'es', "timezone" character varying(60) NOT NULL DEFAULT 'America/Mexico_City', CONSTRAINT "UQ_16c62fe4e00455ff6e37f48b5cd" UNIQUE ("uuid"), CONSTRAINT "UQ_62a9258f166a0897dac03ba7939" UNIQUE ("profile_id"), CONSTRAINT "UQ_f16c5e27515a42d51e2e2e7250c" UNIQUE ("username"), CONSTRAINT "PK_b990508b9f08b03b0c652c678a8" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "social_profiles" ("id" SERIAL NOT NULL, "uuid" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "archived_at" TIMESTAMP WITH TIME ZONE, "profile_id" integer NOT NULL, "social_account_uuid" uuid NOT NULL, "provider" character varying(20) NOT NULL, "provider_display_name" character varying(150), "provider_avatar_url" character varying(500), "provider_profile_url" character varying(500), "synced_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_282f7dd61b0e19f5b7ba6daa0b4" UNIQUE ("uuid"), CONSTRAINT "PK_b07773de7651b6e0d11719b971a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_3634c5718c2a4673810a51a3a8" ON "social_profiles" ("profile_id", "provider") `,
    );
    await queryRunner.query(
      `CREATE TABLE "credential_sessions" ("id" SERIAL NOT NULL, "uuid" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "archived_at" TIMESTAMP WITH TIME ZONE, "session_id" integer NOT NULL, "credential_account_id" integer NOT NULL, CONSTRAINT "UQ_014305dace58ed83bc842bd34e9" UNIQUE ("uuid"), CONSTRAINT "UQ_6a946ad04ec3cc5074589b42201" UNIQUE ("session_id"), CONSTRAINT "PK_6b0ef8f6520469266cdf81804ad" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "social_sessions" ("id" SERIAL NOT NULL, "uuid" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "archived_at" TIMESTAMP WITH TIME ZONE, "session_id" integer NOT NULL, "social_account_id" integer NOT NULL, "provider" character varying(20) NOT NULL, CONSTRAINT "UQ_6bec07f4de6dd88bf5d120620fc" UNIQUE ("uuid"), CONSTRAINT "UQ_045cff00bfa4267c978693cc82e" UNIQUE ("session_id"), CONSTRAINT "PK_cccb4ab82a7cdd7ec0b6efeed83" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`ALTER TABLE "sessions" DROP COLUMN "user_id"`);
    await queryRunner.query(`ALTER TABLE "sessions" ADD "user_id" integer NOT NULL`);
    await queryRunner.query(`ALTER TABLE "sessions" ADD "account_id" integer NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "sessions" ADD CONSTRAINT "UQ_abaa9e068cdd390bc5210f79884" UNIQUE ("token_hash")`,
    );
    await queryRunner.query(
      `ALTER TABLE "tier_module_policies" ADD CONSTRAINT "FK_fa76a4805611c6f268402b34912" FOREIGN KEY ("tier") REFERENCES "tier_plans"("tier") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tier_module_policies" ADD CONSTRAINT "FK_a952412d1cdc3d220fee8b03d34" FOREIGN KEY ("module_id") REFERENCES "modules"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "credential_accounts" ADD CONSTRAINT "FK_ee3e3e2575dc7b27974bb860877" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "social_accounts" ADD CONSTRAINT "FK_ae1e94e34fe10586fda04a99a94" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "catalog_actions" ADD CONSTRAINT "FK_1e4be5a3331df45396fb46c4842" FOREIGN KEY ("module_id") REFERENCES "modules"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tier_action_overrides" ADD CONSTRAINT "FK_3a4489f8b914fa4cba26f319b83" FOREIGN KEY ("tier") REFERENCES "tier_plans"("tier") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tier_action_overrides" ADD CONSTRAINT "FK_40f04fbc4405be1a0f0eff497c7" FOREIGN KEY ("action_id") REFERENCES "catalog_actions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" ADD CONSTRAINT "FK_085d540d9f418cfbdc7bd55bb19" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "FK_2a12933c8e4769b3d1cd2c8c45c" FOREIGN KEY ("credential_account_id") REFERENCES "credential_accounts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "email_verification_tokens" ADD CONSTRAINT "FK_d633df78199521854b2b9146146" FOREIGN KEY ("credential_account_id") REFERENCES "credential_accounts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "commercial_profiles" ADD CONSTRAINT "FK_d86aad2568685f1e00dfbdf725f" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "personal_profiles" ADD CONSTRAINT "FK_62a9258f166a0897dac03ba7939" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "social_profiles" ADD CONSTRAINT "FK_707a4cfedae4e94f5e46143ba13" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "credential_sessions" ADD CONSTRAINT "FK_6a946ad04ec3cc5074589b42201" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "credential_sessions" ADD CONSTRAINT "FK_2c1b9ebe4027c6f543db4f6b3af" FOREIGN KEY ("credential_account_id") REFERENCES "credential_accounts"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" ADD CONSTRAINT "FK_da0cf19646ff5c6e3c0284468e5" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "social_sessions" ADD CONSTRAINT "FK_045cff00bfa4267c978693cc82e" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "social_sessions" ADD CONSTRAINT "FK_2f210ed328eaac49e362252f7f0" FOREIGN KEY ("social_account_id") REFERENCES "social_accounts"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "social_sessions" DROP CONSTRAINT "FK_2f210ed328eaac49e362252f7f0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "social_sessions" DROP CONSTRAINT "FK_045cff00bfa4267c978693cc82e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" DROP CONSTRAINT "FK_da0cf19646ff5c6e3c0284468e5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "credential_sessions" DROP CONSTRAINT "FK_2c1b9ebe4027c6f543db4f6b3af"`,
    );
    await queryRunner.query(
      `ALTER TABLE "credential_sessions" DROP CONSTRAINT "FK_6a946ad04ec3cc5074589b42201"`,
    );
    await queryRunner.query(
      `ALTER TABLE "social_profiles" DROP CONSTRAINT "FK_707a4cfedae4e94f5e46143ba13"`,
    );
    await queryRunner.query(
      `ALTER TABLE "personal_profiles" DROP CONSTRAINT "FK_62a9258f166a0897dac03ba7939"`,
    );
    await queryRunner.query(
      `ALTER TABLE "commercial_profiles" DROP CONSTRAINT "FK_d86aad2568685f1e00dfbdf725f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "email_verification_tokens" DROP CONSTRAINT "FK_d633df78199521854b2b9146146"`,
    );
    await queryRunner.query(
      `ALTER TABLE "password_reset_tokens" DROP CONSTRAINT "FK_2a12933c8e4769b3d1cd2c8c45c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" DROP CONSTRAINT "FK_085d540d9f418cfbdc7bd55bb19"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tier_action_overrides" DROP CONSTRAINT "FK_40f04fbc4405be1a0f0eff497c7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tier_action_overrides" DROP CONSTRAINT "FK_3a4489f8b914fa4cba26f319b83"`,
    );
    await queryRunner.query(
      `ALTER TABLE "catalog_actions" DROP CONSTRAINT "FK_1e4be5a3331df45396fb46c4842"`,
    );
    await queryRunner.query(
      `ALTER TABLE "social_accounts" DROP CONSTRAINT "FK_ae1e94e34fe10586fda04a99a94"`,
    );
    await queryRunner.query(
      `ALTER TABLE "credential_accounts" DROP CONSTRAINT "FK_ee3e3e2575dc7b27974bb860877"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tier_module_policies" DROP CONSTRAINT "FK_a952412d1cdc3d220fee8b03d34"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tier_module_policies" DROP CONSTRAINT "FK_fa76a4805611c6f268402b34912"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" DROP CONSTRAINT "UQ_abaa9e068cdd390bc5210f79884"`,
    );
    await queryRunner.query(`ALTER TABLE "sessions" DROP COLUMN "account_id"`);
    await queryRunner.query(`ALTER TABLE "sessions" DROP COLUMN "user_id"`);
    await queryRunner.query(`ALTER TABLE "sessions" ADD "user_id" integer NOT NULL`);
    await queryRunner.query(`DROP TABLE "social_sessions"`);
    await queryRunner.query(`DROP TABLE "credential_sessions"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_3634c5718c2a4673810a51a3a8"`);
    await queryRunner.query(`DROP TABLE "social_profiles"`);
    await queryRunner.query(`DROP TABLE "personal_profiles"`);
    await queryRunner.query(`DROP TABLE "profiles"`);
    await queryRunner.query(`DROP TABLE "commercial_profiles"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_d633df78199521854b2b914614"`);
    await queryRunner.query(`DROP TABLE "email_verification_tokens"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_91185d86d5d7557b19abbb2868"`);
    await queryRunner.query(`DROP TABLE "password_reset_tokens"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_abaa9e068cdd390bc5210f7988"`);
    await queryRunner.query(`DROP TABLE "sessions"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_0e65969a2dc1f558d77daacb85"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_43c10501c713ab675b9aea3d21"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_dd2cbbbc127b69ce5637c22270"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_e6470df66c7cac761f40efe6db"`);
    await queryRunner.query(`DROP TABLE "verification_attempts"`);
    await queryRunner.query(`DROP TABLE "tenant_config"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_45aa4b00b2400b1852516f2bdc"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_ffba0c9ecd4fd98550b3300ae6"`);
    await queryRunner.query(`DROP TABLE "tenant_members"`);
    await queryRunner.query(`DROP TABLE "tenant_profiles"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_c59559e7872bc9726adef4669f"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_2310ecc5cb8be427097154b18f"`);
    await queryRunner.query(`DROP TABLE "tenants"`);
    await queryRunner.query(`DROP TABLE "tier_action_overrides"`);
    await queryRunner.query(`DROP TABLE "catalog_actions"`);
    await queryRunner.query(`DROP TABLE "accounts"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_244e28edb736d5184e50dff200"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_411c2df970da88bd9e8c6a51ee"`);
    await queryRunner.query(`DROP TABLE "social_accounts"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_dfbe65d48344a6c60eae7e453e"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_8a13d1aee5c999536747a967a8"`);
    await queryRunner.query(`DROP TABLE "credential_accounts"`);
    await queryRunner.query(`DROP TABLE "tier_module_policies"`);
    await queryRunner.query(`DROP TABLE "modules"`);
    await queryRunner.query(`DROP TABLE "tier_plans"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_process_state_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_process_state_correlation_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_process_state_process_name"`);
    await queryRunner.query(`DROP TABLE "process_state"`);
  }
}

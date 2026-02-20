import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1771552157484 implements MigrationInterface {
    name = 'InitialSchema1771552157484'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "social_accounts" ("id" SERIAL NOT NULL, "uuid" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "archived_at" TIMESTAMP WITH TIME ZONE, "user_id" integer NOT NULL, "provider" character varying(20) NOT NULL, "provider_id" character varying(255) NOT NULL, CONSTRAINT "UQ_2ee04e5974c7a8a47f484fcb51e" UNIQUE ("uuid"), CONSTRAINT "PK_e9e58d2d8e9fafa20af914d9750" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_244e28edb736d5184e50dff200" ON "social_accounts" ("provider", "provider_id") `);
        await queryRunner.query(`CREATE TABLE "users" ("id" SERIAL NOT NULL, "uuid" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "archived_at" TIMESTAMP WITH TIME ZONE, "email" character varying(255) NOT NULL, "username" character varying(30) NOT NULL, "password_hash" character varying(255), "status" character varying(30) NOT NULL DEFAULT 'pending_verification', "email_verified_at" TIMESTAMP WITH TIME ZONE, "verification_blocked_until" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_951b8f1dfc94ac1d0301a14b7e1" UNIQUE ("uuid"), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "UQ_fe0bb3f6520ee0469504521e710" UNIQUE ("username"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_3676155292d72c67cd4e090514" ON "users" ("status") `);
        await queryRunner.query(`CREATE TABLE "verification_attempts" ("id" SERIAL NOT NULL, "uuid" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "archived_at" TIMESTAMP WITH TIME ZONE, "user_uuid" character varying(36), "email" character varying(255), "ip_address" inet NOT NULL, "user_agent" text, "code_entered" character varying(10), "success" boolean NOT NULL DEFAULT false, "verification_type" character varying(30) NOT NULL DEFAULT 'email_verification', "attempted_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), CONSTRAINT "UQ_64c5c9651a733221f41f8bb1e5b" UNIQUE ("uuid"), CONSTRAINT "PK_2cc0cabfe71231719a23cfcdaf8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_e6470df66c7cac761f40efe6db" ON "verification_attempts" ("user_uuid") `);
        await queryRunner.query(`CREATE INDEX "IDX_dd2cbbbc127b69ce5637c22270" ON "verification_attempts" ("email") `);
        await queryRunner.query(`CREATE INDEX "IDX_43c10501c713ab675b9aea3d21" ON "verification_attempts" ("ip_address") `);
        await queryRunner.query(`CREATE INDEX "IDX_0e65969a2dc1f558d77daacb85" ON "verification_attempts" ("attempted_at") `);
        await queryRunner.query(`CREATE TABLE "sessions" ("id" SERIAL NOT NULL, "uuid" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "archived_at" TIMESTAMP WITH TIME ZONE, "user_id" integer NOT NULL, "token_hash" character varying(128) NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "UQ_faf29798ea59ac7f07b1be6f79b" UNIQUE ("uuid"), CONSTRAINT "PK_3238ef96f18b355b671619111bc" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_abaa9e068cdd390bc5210f7988" ON "sessions" ("token_hash") `);
        await queryRunner.query(`CREATE TABLE "password_reset_tokens" ("id" SERIAL NOT NULL, "uuid" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "archived_at" TIMESTAMP WITH TIME ZONE, "user_id" integer NOT NULL, "token_hash" character varying(128) NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "used_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_573c6c232c2b7d66202cbf49d87" UNIQUE ("uuid"), CONSTRAINT "PK_d16bebd73e844c48bca50ff8d3d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_91185d86d5d7557b19abbb2868" ON "password_reset_tokens" ("token_hash") `);
        await queryRunner.query(`CREATE TABLE "email_verification_tokens" ("id" SERIAL NOT NULL, "uuid" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "archived_at" TIMESTAMP WITH TIME ZONE, "user_id" integer NOT NULL, "code_hash" character varying(128) NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "used_at" TIMESTAMP WITH TIME ZONE, "resend_count" integer NOT NULL DEFAULT '0', "last_resent_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_dbdc8cf587cd11e5895bcfa666e" UNIQUE ("uuid"), CONSTRAINT "PK_417a095bbed21c2369a6a01ab9a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_fdcb77f72f529bf65c95d72a14" ON "email_verification_tokens" ("user_id") `);
        await queryRunner.query(`ALTER TABLE "social_accounts" ADD CONSTRAINT "FK_05a0f282d3bed93ca048a7e54dd" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "sessions" ADD CONSTRAINT "FK_085d540d9f418cfbdc7bd55bb19" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "FK_52ac39dd8a28730c63aeb428c9c" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "email_verification_tokens" ADD CONSTRAINT "FK_fdcb77f72f529bf65c95d72a147" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "email_verification_tokens" DROP CONSTRAINT "FK_fdcb77f72f529bf65c95d72a147"`);
        await queryRunner.query(`ALTER TABLE "password_reset_tokens" DROP CONSTRAINT "FK_52ac39dd8a28730c63aeb428c9c"`);
        await queryRunner.query(`ALTER TABLE "sessions" DROP CONSTRAINT "FK_085d540d9f418cfbdc7bd55bb19"`);
        await queryRunner.query(`ALTER TABLE "social_accounts" DROP CONSTRAINT "FK_05a0f282d3bed93ca048a7e54dd"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_fdcb77f72f529bf65c95d72a14"`);
        await queryRunner.query(`DROP TABLE "email_verification_tokens"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_91185d86d5d7557b19abbb2868"`);
        await queryRunner.query(`DROP TABLE "password_reset_tokens"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_abaa9e068cdd390bc5210f7988"`);
        await queryRunner.query(`DROP TABLE "sessions"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0e65969a2dc1f558d77daacb85"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_43c10501c713ab675b9aea3d21"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_dd2cbbbc127b69ce5637c22270"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e6470df66c7cac761f40efe6db"`);
        await queryRunner.query(`DROP TABLE "verification_attempts"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3676155292d72c67cd4e090514"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_244e28edb736d5184e50dff200"`);
        await queryRunner.query(`DROP TABLE "social_accounts"`);
    }

}

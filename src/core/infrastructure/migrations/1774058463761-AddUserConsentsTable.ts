import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserConsentsTable1774058463761 implements MigrationInterface {
    name = 'AddUserConsentsTable1774058463761'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "identity"."user_consents" ("id" SERIAL NOT NULL, "user_uuid" character varying(36) NOT NULL, "consent_type" character varying(30) NOT NULL, "granted" boolean NOT NULL, "document_version" character varying(20) NOT NULL DEFAULT 'v1.0', "ip_address" character varying(45), "user_agent" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_65e4c6d6204ad8719abf4b30326" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_user_consents_lookup" ON "identity"."user_consents" ("user_uuid", "consent_type", "created_at") `);
        await queryRunner.query(`CREATE INDEX "idx_user_consents_user_uuid" ON "identity"."user_consents" ("user_uuid") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "identity"."idx_user_consents_user_uuid"`);
        await queryRunner.query(`DROP INDEX "identity"."idx_user_consents_lookup"`);
        await queryRunner.query(`DROP TABLE "identity"."user_consents"`);
    }

}

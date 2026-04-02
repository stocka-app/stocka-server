import { MigrationInterface, QueryRunner } from "typeorm";

export class AddStorageActivityLog1775171889034 implements MigrationInterface {
    name = 'AddStorageActivityLog1775171889034'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "storage"."storage_activity_log" ("id" SERIAL NOT NULL, "uuid" uuid NOT NULL, "storage_uuid" uuid NOT NULL, "tenant_uuid" uuid NOT NULL, "actor_uuid" uuid NOT NULL, "action" character varying(30) NOT NULL, "previous_value" jsonb, "new_value" jsonb, "occurred_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), CONSTRAINT "UQ_a30e39a2ed3cf9e6672b85e95ef" UNIQUE ("uuid"), CONSTRAINT "PK_77bf3c09672102e1f82be6450b2" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_activity_log_storage_occurred" ON "storage"."storage_activity_log" ("storage_uuid", "occurred_at") `);
        await queryRunner.query(`CREATE INDEX "idx_activity_log_tenant_uuid" ON "storage"."storage_activity_log" ("tenant_uuid") `);
        await queryRunner.query(`CREATE INDEX "idx_activity_log_storage_uuid" ON "storage"."storage_activity_log" ("storage_uuid") `);
        await queryRunner.query(`ALTER TABLE "storage"."custom_rooms" ALTER COLUMN "address" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "storage"."custom_rooms" ALTER COLUMN "icon" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "storage"."custom_rooms" ALTER COLUMN "color" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "storage"."store_rooms" ALTER COLUMN "address" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "storage"."store_rooms" ALTER COLUMN "icon" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "storage"."store_rooms" ALTER COLUMN "color" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "storage"."warehouses" ALTER COLUMN "address" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "storage"."warehouses" ALTER COLUMN "icon" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "storage"."warehouses" ALTER COLUMN "color" SET NOT NULL`);
        await queryRunner.query(`DROP INDEX "storage"."idx_activity_log_storage_occurred"`);
        await queryRunner.query(`CREATE INDEX "idx_activity_log_storage_occurred" ON "storage"."storage_activity_log" ("storage_uuid", "occurred_at") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "storage"."idx_activity_log_storage_occurred"`);
        await queryRunner.query(`CREATE INDEX "idx_activity_log_storage_occurred" ON "storage"."storage_activity_log" ("storage_uuid", "occurred_at") `);
        await queryRunner.query(`ALTER TABLE "storage"."warehouses" ALTER COLUMN "color" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "storage"."warehouses" ALTER COLUMN "icon" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "storage"."warehouses" ALTER COLUMN "address" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "storage"."store_rooms" ALTER COLUMN "color" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "storage"."store_rooms" ALTER COLUMN "icon" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "storage"."store_rooms" ALTER COLUMN "address" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "storage"."custom_rooms" ALTER COLUMN "color" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "storage"."custom_rooms" ALTER COLUMN "icon" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "storage"."custom_rooms" ALTER COLUMN "address" DROP NOT NULL`);
        await queryRunner.query(`DROP INDEX "storage"."idx_activity_log_storage_uuid"`);
        await queryRunner.query(`DROP INDEX "storage"."idx_activity_log_tenant_uuid"`);
        await queryRunner.query(`DROP INDEX "storage"."idx_activity_log_storage_occurred"`);
        await queryRunner.query(`DROP TABLE "storage"."storage_activity_log"`);
    }

}

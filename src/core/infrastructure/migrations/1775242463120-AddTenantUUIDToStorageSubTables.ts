import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTenantUUIDToStorageSubTables1775242463120 implements MigrationInterface {
    name = 'AddTenantUUIDToStorageSubTables1775242463120'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "storage"."custom_rooms" ADD "tenant_uuid" uuid NOT NULL`);
        await queryRunner.query(`ALTER TABLE "storage"."store_rooms" ADD "tenant_uuid" uuid NOT NULL`);
        await queryRunner.query(`ALTER TABLE "storage"."storages" ADD "archived_at" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "storage"."warehouses" ADD "tenant_uuid" uuid NOT NULL`);
        await queryRunner.query(`ALTER TABLE "storage"."storage_activity_log" ADD "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "storage"."storage_activity_log" ADD "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "storage"."storage_activity_log" ADD "archived_at" TIMESTAMP WITH TIME ZONE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "storage"."storage_activity_log" DROP COLUMN "archived_at"`);
        await queryRunner.query(`ALTER TABLE "storage"."storage_activity_log" DROP COLUMN "updated_at"`);
        await queryRunner.query(`ALTER TABLE "storage"."storage_activity_log" DROP COLUMN "created_at"`);
        await queryRunner.query(`ALTER TABLE "storage"."warehouses" DROP COLUMN "tenant_uuid"`);
        await queryRunner.query(`ALTER TABLE "storage"."storages" DROP COLUMN "archived_at"`);
        await queryRunner.query(`ALTER TABLE "storage"."store_rooms" DROP COLUMN "tenant_uuid"`);
        await queryRunner.query(`ALTER TABLE "storage"."custom_rooms" DROP COLUMN "tenant_uuid"`);
    }

}

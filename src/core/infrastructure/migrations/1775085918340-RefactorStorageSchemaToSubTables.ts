import { MigrationInterface, QueryRunner } from "typeorm";

export class RefactorStorageSchemaToSubTables1775085918340 implements MigrationInterface {
    name = 'RefactorStorageSchemaToSubTables1775085918340'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "storage"."storages" DROP COLUMN "archived_at"`);
        await queryRunner.query(`ALTER TABLE "storage"."storages" DROP COLUMN "name"`);
        await queryRunner.query(`ALTER TABLE "storage"."storages" DROP COLUMN "frozen_at"`);
        await queryRunner.query(`ALTER TABLE "storage"."storages" DROP COLUMN "description"`);
        await queryRunner.query(`ALTER TABLE "storage"."custom_rooms" ADD "name" character varying(100) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "storage"."custom_rooms" ADD "description" character varying(300)`);
        await queryRunner.query(`ALTER TABLE "storage"."custom_rooms" ADD "icon" character varying(100)`);
        await queryRunner.query(`ALTER TABLE "storage"."custom_rooms" ADD "color" character varying(20)`);
        await queryRunner.query(`ALTER TABLE "storage"."custom_rooms" ADD "frozen_at" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "storage"."custom_rooms" ADD "archived_at" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "storage"."warehouses" ADD "name" character varying(100) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "storage"."warehouses" ADD "description" character varying(300)`);
        await queryRunner.query(`ALTER TABLE "storage"."warehouses" ADD "icon" character varying(100)`);
        await queryRunner.query(`ALTER TABLE "storage"."warehouses" ADD "color" character varying(20)`);
        await queryRunner.query(`ALTER TABLE "storage"."warehouses" ADD "frozen_at" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "storage"."warehouses" ADD "archived_at" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "storage"."storages" ADD "parent_uuid" uuid`);
        await queryRunner.query(`ALTER TABLE "storage"."store_rooms" ADD "name" character varying(100) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "storage"."store_rooms" ADD "description" character varying(300)`);
        await queryRunner.query(`ALTER TABLE "storage"."store_rooms" ADD "icon" character varying(100)`);
        await queryRunner.query(`ALTER TABLE "storage"."store_rooms" ADD "color" character varying(20)`);
        await queryRunner.query(`ALTER TABLE "storage"."store_rooms" ADD "frozen_at" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "storage"."store_rooms" ADD "archived_at" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "storage"."warehouses" ALTER COLUMN "address" DROP NOT NULL`);
        await queryRunner.query(`CREATE INDEX "idx_storages_parent_uuid" ON "storage"."storages" ("parent_uuid") WHERE "parent_uuid" IS NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "storage"."idx_storages_parent_uuid"`);
        await queryRunner.query(`ALTER TABLE "storage"."warehouses" ALTER COLUMN "address" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "storage"."store_rooms" DROP COLUMN "archived_at"`);
        await queryRunner.query(`ALTER TABLE "storage"."store_rooms" DROP COLUMN "frozen_at"`);
        await queryRunner.query(`ALTER TABLE "storage"."store_rooms" DROP COLUMN "color"`);
        await queryRunner.query(`ALTER TABLE "storage"."store_rooms" DROP COLUMN "icon"`);
        await queryRunner.query(`ALTER TABLE "storage"."store_rooms" DROP COLUMN "description"`);
        await queryRunner.query(`ALTER TABLE "storage"."store_rooms" DROP COLUMN "name"`);
        await queryRunner.query(`ALTER TABLE "storage"."storages" DROP COLUMN "parent_uuid"`);
        await queryRunner.query(`ALTER TABLE "storage"."warehouses" DROP COLUMN "archived_at"`);
        await queryRunner.query(`ALTER TABLE "storage"."warehouses" DROP COLUMN "frozen_at"`);
        await queryRunner.query(`ALTER TABLE "storage"."warehouses" DROP COLUMN "color"`);
        await queryRunner.query(`ALTER TABLE "storage"."warehouses" DROP COLUMN "icon"`);
        await queryRunner.query(`ALTER TABLE "storage"."warehouses" DROP COLUMN "description"`);
        await queryRunner.query(`ALTER TABLE "storage"."warehouses" DROP COLUMN "name"`);
        await queryRunner.query(`ALTER TABLE "storage"."custom_rooms" DROP COLUMN "archived_at"`);
        await queryRunner.query(`ALTER TABLE "storage"."custom_rooms" DROP COLUMN "frozen_at"`);
        await queryRunner.query(`ALTER TABLE "storage"."custom_rooms" DROP COLUMN "color"`);
        await queryRunner.query(`ALTER TABLE "storage"."custom_rooms" DROP COLUMN "icon"`);
        await queryRunner.query(`ALTER TABLE "storage"."custom_rooms" DROP COLUMN "description"`);
        await queryRunner.query(`ALTER TABLE "storage"."custom_rooms" DROP COLUMN "name"`);
        await queryRunner.query(`ALTER TABLE "storage"."storages" ADD "description" text`);
        await queryRunner.query(`ALTER TABLE "storage"."storages" ADD "frozen_at" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "storage"."storages" ADD "name" character varying(100) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "storage"."storages" ADD "archived_at" TIMESTAMP WITH TIME ZONE`);
    }

}

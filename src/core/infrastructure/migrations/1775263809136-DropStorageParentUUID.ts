import { MigrationInterface, QueryRunner } from "typeorm";

export class DropStorageParentUUID1775263809136 implements MigrationInterface {
    name = 'DropStorageParentUUID1775263809136'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "storage"."custom_rooms" DROP COLUMN "parent_uuid"`);
        await queryRunner.query(`ALTER TABLE "storage"."store_rooms" DROP COLUMN "parent_uuid"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "storage"."store_rooms" ADD "parent_uuid" uuid`);
        await queryRunner.query(`ALTER TABLE "storage"."custom_rooms" ADD "parent_uuid" uuid`);
    }

}

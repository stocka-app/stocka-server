import { MigrationInterface, QueryRunner } from "typeorm";

export class MakeStorageSubTypesAddressNullable1776293905601 implements MigrationInterface {
    name = 'MakeStorageSubTypesAddressNullable1776293905601'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "storage"."custom_rooms" ALTER COLUMN "address" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "storage"."store_rooms" ALTER COLUMN "address" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "storage"."store_rooms" ALTER COLUMN "address" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "storage"."custom_rooms" ALTER COLUMN "address" SET NOT NULL`);
    }

}

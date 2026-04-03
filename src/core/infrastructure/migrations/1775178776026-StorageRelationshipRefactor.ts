import { MigrationInterface, QueryRunner } from "typeorm";

export class StorageRelationshipRefactor1775178776026 implements MigrationInterface {
    name = 'StorageRelationshipRefactor1775178776026'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "storage"."idx_storages_parent_uuid"`);
        await queryRunner.query(`ALTER TABLE "storage"."storages" DROP COLUMN "type"`);
        await queryRunner.query(`ALTER TABLE "storage"."storages" DROP COLUMN "parent_uuid"`);
        await queryRunner.query(`ALTER TABLE "storage"."custom_rooms" ADD "parent_uuid" uuid`);
        await queryRunner.query(`ALTER TABLE "storage"."store_rooms" ADD "parent_uuid" uuid`);
        await queryRunner.query(`ALTER TABLE "storage"."custom_rooms" DROP CONSTRAINT "FK_40378daf9a41d68b830692b4616"`);
        await queryRunner.query(`ALTER TABLE "storage"."custom_rooms" DROP CONSTRAINT "REL_40378daf9a41d68b830692b461"`);
        await queryRunner.query(`ALTER TABLE "storage"."store_rooms" DROP CONSTRAINT "FK_063eba9e418df9266e5f2f9b58d"`);
        await queryRunner.query(`ALTER TABLE "storage"."store_rooms" DROP CONSTRAINT "REL_063eba9e418df9266e5f2f9b58"`);
        await queryRunner.query(`ALTER TABLE "storage"."warehouses" DROP CONSTRAINT "FK_4de20480cbb78ccae6e1771a34d"`);
        await queryRunner.query(`ALTER TABLE "storage"."warehouses" DROP CONSTRAINT "REL_4de20480cbb78ccae6e1771a34"`);
        await queryRunner.query(`ALTER TABLE "storage"."custom_rooms" ADD CONSTRAINT "FK_40378daf9a41d68b830692b4616" FOREIGN KEY ("storage_id") REFERENCES "storage"."storages"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "storage"."store_rooms" ADD CONSTRAINT "FK_063eba9e418df9266e5f2f9b58d" FOREIGN KEY ("storage_id") REFERENCES "storage"."storages"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "storage"."warehouses" ADD CONSTRAINT "FK_4de20480cbb78ccae6e1771a34d" FOREIGN KEY ("storage_id") REFERENCES "storage"."storages"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "storage"."warehouses" DROP CONSTRAINT "FK_4de20480cbb78ccae6e1771a34d"`);
        await queryRunner.query(`ALTER TABLE "storage"."store_rooms" DROP CONSTRAINT "FK_063eba9e418df9266e5f2f9b58d"`);
        await queryRunner.query(`ALTER TABLE "storage"."custom_rooms" DROP CONSTRAINT "FK_40378daf9a41d68b830692b4616"`);
        await queryRunner.query(`ALTER TABLE "storage"."warehouses" ADD CONSTRAINT "REL_4de20480cbb78ccae6e1771a34" UNIQUE ("storage_id")`);
        await queryRunner.query(`ALTER TABLE "storage"."warehouses" ADD CONSTRAINT "FK_4de20480cbb78ccae6e1771a34d" FOREIGN KEY ("storage_id") REFERENCES "storage"."storages"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "storage"."store_rooms" ADD CONSTRAINT "REL_063eba9e418df9266e5f2f9b58" UNIQUE ("storage_id")`);
        await queryRunner.query(`ALTER TABLE "storage"."store_rooms" ADD CONSTRAINT "FK_063eba9e418df9266e5f2f9b58d" FOREIGN KEY ("storage_id") REFERENCES "storage"."storages"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "storage"."custom_rooms" ADD CONSTRAINT "REL_40378daf9a41d68b830692b461" UNIQUE ("storage_id")`);
        await queryRunner.query(`ALTER TABLE "storage"."custom_rooms" ADD CONSTRAINT "FK_40378daf9a41d68b830692b4616" FOREIGN KEY ("storage_id") REFERENCES "storage"."storages"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "storage"."store_rooms" DROP COLUMN "parent_uuid"`);
        await queryRunner.query(`ALTER TABLE "storage"."custom_rooms" DROP COLUMN "parent_uuid"`);
        await queryRunner.query(`ALTER TABLE "storage"."storages" ADD "parent_uuid" uuid`);
        await queryRunner.query(`ALTER TABLE "storage"."storages" ADD "type" character varying(20) NOT NULL`);
        await queryRunner.query(`CREATE INDEX "idx_storages_parent_uuid" ON "storage"."storages" ("parent_uuid") WHERE (parent_uuid IS NOT NULL)`);
    }

}

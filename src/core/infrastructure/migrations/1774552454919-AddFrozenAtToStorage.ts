import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFrozenAtToStorage1774552454919 implements MigrationInterface {
  name = 'AddFrozenAtToStorage1774552454919';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "storage"."storages" ADD "frozen_at" TIMESTAMP WITH TIME ZONE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "storage"."storages" DROP COLUMN "frozen_at"`);
  }
}

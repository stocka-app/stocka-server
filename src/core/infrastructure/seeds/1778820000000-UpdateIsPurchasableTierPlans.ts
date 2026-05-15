import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateIsPurchasableTierPlans1778820000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "tiers"."tier_plans"
      SET "is_purchasable" = CASE
        WHEN "tier" IN ('STARTER', 'GROWTH') THEN true
        ELSE false
      END
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "tiers"."tier_plans" SET "is_purchasable" = false
    `);
  }
}

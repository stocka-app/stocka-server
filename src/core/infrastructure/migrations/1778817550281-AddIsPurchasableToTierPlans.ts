import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIsPurchasableToTierPlans1778817550281 implements MigrationInterface {
    name = 'AddIsPurchasableToTierPlans1778817550281'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tiers"."tier_plans" ADD "is_purchasable" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tiers"."tier_plans" DROP COLUMN "is_purchasable"`);
    }

}

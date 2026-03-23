import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedTierPlans1774310400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "tiers"."tier_plans"
        ("tier", "name", "max_products", "max_users", "max_warehouses",
         "tier_order", "max_custom_rooms", "max_store_rooms",
         "invitations_enabled", "advanced_reports_enabled", "policy_version")
      VALUES
        ('FREE',       'Free',       100,  1,  0,    0, 1,  1,  false, false, now()),
        ('STARTER',    'Starter',    1000, 5,  3,    1, 3,  3,  true,  false, now()),
        ('GROWTH',     'Growth',     5000, 25, 10,   2, 10, 10, true,  true,  now()),
        ('ENTERPRISE', 'Enterprise', NULL, NULL, NULL, 3, -1, -1, true,  true,  now())
      ON CONFLICT ("tier") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "tiers"."tier_plans"
      WHERE "tier" IN ('FREE', 'STARTER', 'GROWTH', 'ENTERPRISE')
    `);
  }
}

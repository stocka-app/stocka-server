import { MigrationInterface, QueryRunner } from 'typeorm';
import { v7 as uuidV7 } from 'uuid';

/**
 * Initial catalog seed for the billing schema.
 *
 * Populates the 3 catalog tables (idempotent):
 *   1. payment_providers       — registers STRIPE provider
 *   2. pricing_plans           — STARTER + GROWTH at MXN MONTHLY (prices from env)
 *   3. provider_price_mappings — links each pricing_plan to its Stripe Price ID
 *
 * Reads Stripe IDs from env vars:
 *   STRIPE_PRICE_ID_STARTER_MONTHLY, STRIPE_PRICE_ID_GROWTH_MONTHLY,
 *   STRIPE_PRODUCT_ID_STARTER, STRIPE_PRODUCT_ID_GROWTH
 *
 * Uses fixed effective_from ('2026-05-14T00:00:00Z') so re-running the seed
 * is idempotent (UNIQUE constraint on (tier, billing_cycle, currency, effective_from)).
 */
export class SeedBillingCatalog1778830000000 implements MigrationInterface {
  private readonly EFFECTIVE_FROM = '2026-05-14T00:00:00Z';
  private readonly PROVIDER_CODE = 'STRIPE';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const starterPriceId = this.requireEnv('STRIPE_PRICE_ID_STARTER_MONTHLY');
    const growthPriceId = this.requireEnv('STRIPE_PRICE_ID_GROWTH_MONTHLY');
    const starterProductId = this.requireEnv('STRIPE_PRODUCT_ID_STARTER');
    const growthProductId = this.requireEnv('STRIPE_PRODUCT_ID_GROWTH');

    await this.seedPaymentProvider(queryRunner);
    const starterPlanId = await this.seedPricingPlan(queryRunner, 'STARTER', '199.00');
    const growthPlanId = await this.seedPricingPlan(queryRunner, 'GROWTH', '499.00');
    await this.seedProviderPriceMapping(
      queryRunner,
      starterPlanId,
      starterProductId,
      starterPriceId,
    );
    await this.seedProviderPriceMapping(queryRunner, growthPlanId, growthProductId, growthPriceId);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
      DELETE FROM "billing"."provider_price_mappings"
      WHERE "provider_code" = $1
    `,
      [this.PROVIDER_CODE],
    );

    await queryRunner.query(
      `
      DELETE FROM "billing"."pricing_plans"
      WHERE "tier" IN ('STARTER', 'GROWTH')
        AND "billing_cycle" = 'MONTHLY'
        AND "currency" = 'MXN'
        AND "effective_from" = $1
    `,
      [this.EFFECTIVE_FROM],
    );

    await queryRunner.query(
      `
      DELETE FROM "billing"."payment_providers"
      WHERE "code" = $1
    `,
      [this.PROVIDER_CODE],
    );
  }

  private requireEnv(key: string): string {
    const value = process.env[key];
    if (!value || value.includes('REPLACE_ME')) {
      throw new Error(
        `[SeedBillingCatalog] Missing or placeholder env var: ${key}. ` +
          `Set the real value from Stripe Dashboard before running this seed.`,
      );
    }
    return value;
  }

  private async seedPaymentProvider(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "billing"."payment_providers"
        ("code", "name", "is_enabled", "api_version", "default_currency", "webhook_endpoint_path")
      VALUES
        ('STRIPE', 'Stripe (Test Mode)', true, '2026-04-22.dahlia', 'MXN', '/api/billing/stripe/webhook')
      ON CONFLICT ("code") DO NOTHING
    `);
  }

  private async seedPricingPlan(
    queryRunner: QueryRunner,
    tier: 'STARTER' | 'GROWTH',
    amount: string,
  ): Promise<number> {
    const existing = (await queryRunner.query(
      `
      SELECT "id" FROM "billing"."pricing_plans"
      WHERE "tier" = $1 AND "billing_cycle" = 'MONTHLY'
        AND "currency" = 'MXN' AND "effective_from" = $2
      LIMIT 1
    `,
      [tier, this.EFFECTIVE_FROM],
    )) as Array<{ id: number }>;

    if (existing.length > 0) {
      return existing[0].id;
    }

    const inserted = (await queryRunner.query(
      `
      INSERT INTO "billing"."pricing_plans"
        ("uuid", "tier", "billing_cycle", "currency", "amount", "trial_days",
         "is_active", "effective_from")
      VALUES
        ($1, $2, 'MONTHLY', 'MXN', $3, 0, true, $4)
      RETURNING "id"
    `,
      [uuidV7(), tier, amount, this.EFFECTIVE_FROM],
    )) as Array<{ id: number }>;

    return inserted[0].id;
  }

  private async seedProviderPriceMapping(
    queryRunner: QueryRunner,
    pricingPlanId: number,
    externalProductId: string,
    externalPriceId: string,
  ): Promise<void> {
    const existing = await queryRunner.query(
      `
      SELECT "id" FROM "billing"."provider_price_mappings"
      WHERE "pricing_plan_id" = $1 AND "provider_code" = $2 AND "is_active" = true
      LIMIT 1
    `,
      [pricingPlanId, this.PROVIDER_CODE],
    );

    if (existing.length > 0) {
      return;
    }

    await queryRunner.query(
      `
      INSERT INTO "billing"."provider_price_mappings"
        ("uuid", "pricing_plan_id", "provider_code", "external_product_id",
         "external_price_id", "is_active")
      VALUES
        ($1, $2, $3, $4, $5, true)
    `,
      [uuidV7(), pricingPlanId, this.PROVIDER_CODE, externalProductId, externalPriceId],
    );
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';
import { v7 as uuidV7 } from 'uuid';

/**
 * Backfill billing.subscriptions for all existing tenants.
 *
 * Invariante del producto: todo tenant tiene EXACTAMENTE una sub
 * (incluso si está en FREE — sin pricing/provider asociados).
 *
 * Esta migración garantiza la invariante para tenants creados antes
 * de que existiera el schema billing. Inserta una row por cada tenant
 * sin sub, con valores FREE (pricing_plan_id NULL, provider_code NULL,
 * status ACTIVE).
 *
 * Idempotente: el WHERE NOT EXISTS evita duplicar subs en re-corridas.
 *
 * UUIDs generados con v7 (timestamp-based) — NUNCA v4. Ver
 * feedback_uuid_v7_only.md.
 */
export class BackfillSubscriptionsForExistingTenants1778840000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const tenants = (await queryRunner.query(`
      SELECT t."uuid"
      FROM "tenants"."tenants" t
      WHERE NOT EXISTS (
        SELECT 1 FROM "billing"."subscriptions" s
        WHERE s."tenant_uuid" = t."uuid"
      )
    `)) as Array<{ uuid: string }>;

    if (tenants.length === 0) {
      return;
    }

    for (const tenant of tenants) {
      await queryRunner.query(
        `
        INSERT INTO "billing"."subscriptions"
          ("uuid", "tenant_uuid", "pricing_plan_id", "provider_code",
           "external_customer_id", "external_subscription_id",
           "status", "current_period_start", "current_period_end",
           "cancel_at_period_end", "trial_ends_at", "grace_period_ends_at", "metadata")
        VALUES
          ($1, $2, NULL, NULL, NULL, NULL, 'ACTIVE', NULL, NULL, false, NULL, NULL, NULL)
      `,
        [uuidV7(), tenant.uuid],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Solo borra subs en estado FREE (pricing_plan_id NULL) — no toca
    // subs activas que ya hayan migrado a tier pagado posteriormente.
    await queryRunner.query(`
      DELETE FROM "billing"."subscriptions"
      WHERE "pricing_plan_id" IS NULL
        AND "provider_code" IS NULL
        AND "status" = 'ACTIVE'
    `);
  }
}

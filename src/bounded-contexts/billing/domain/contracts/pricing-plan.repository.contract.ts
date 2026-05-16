import { TierVO } from '@tenant/domain/value-objects/tier.vo';
import { PricingPlanModel } from '@billing/domain/models/pricing-plan.model';
import { BillingCycleVO } from '@billing/domain/value-objects/billing-cycle.vo';

/**
 * Read-only repository for the pricing-plan catalog. Plans are seeded
 * out-of-band (migrations / ops scripts); the billing BC only reads.
 * Returns `PricingPlanModel` (not an aggregate) because pricing plans
 * have no domain operations — they're values, not actors.
 */
export interface IPricingPlanRepository {
  findById(id: number): Promise<PricingPlanModel | null>;

  /**
   * Resolves the active plan for a (tier, cycle, currency) tuple at the
   * given moment — picks the row whose `effectiveFrom <= now` and
   * (`effectiveUntil` is null OR `now < effectiveUntil`). Used by the
   * upgrade handler to find which `pricingPlanId` to attach.
   */
  findByTierAndCycle(
    tier: TierVO,
    cycle: BillingCycleVO,
    currency: string,
    now: Date,
  ): Promise<PricingPlanModel | null>;

  /**
   * All currently available plans (active + within effectivity window).
   * Used by the public pricing-page endpoint to list what customers
   * can purchase right now.
   */
  findAllActive(now: Date): Promise<PricingPlanModel[]>;
}

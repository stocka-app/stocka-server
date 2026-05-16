import { ProviderPriceMappingModel } from '@billing/domain/models/provider-price-mapping.model';
import { PaymentProviderCodeVO } from '@billing/domain/value-objects/payment-provider-code.vo';

/**
 * Read-only bridge repository between a domain `PricingPlan` and a
 * payment provider's external identifiers (Stripe `prod_xxx` / `price_xxx`).
 * Seeded out-of-band when ops registers a new plan or onboards a new
 * provider. Returns `ProviderPriceMappingModel`.
 */
export interface IProviderPriceMappingRepository {
  /**
   * Resolves the active mapping for a (pricingPlanId, provider) pair.
   * Used by the upgrade handler to translate a domain plan into the
   * Stripe `price_id` needed for Checkout.
   */
  findByPricingPlan(
    pricingPlanId: number,
    provider: PaymentProviderCodeVO,
  ): Promise<ProviderPriceMappingModel | null>;

  /**
   * Reverse lookup from an external `price_id` to the domain plan. Used
   * by webhook handlers that receive a Stripe event with a price ID and
   * need to identify which internal plan it corresponds to.
   */
  findByExternalPriceId(
    provider: PaymentProviderCodeVO,
    externalPriceId: string,
  ): Promise<ProviderPriceMappingModel | null>;
}

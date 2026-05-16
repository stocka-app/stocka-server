import { BaseModel } from '@shared/domain/base/base.model';
import { UUIDVO } from '@shared/domain/value-objects/compound/uuid.vo';
import { PaymentProviderCodeVO } from '@billing/domain/value-objects/payment-provider-code.vo';

export interface ProviderPriceMappingModelReconstituteProps {
  id: number;
  uuid: UUIDVO;
  pricingPlanId: number;
  provider: PaymentProviderCodeVO;
  externalProductId: string;
  externalPriceId: string;
  isActive: boolean;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Pure data carrier for the bridge between a domain `PricingPlan` and a
 * payment provider's external product/price identifiers (e.g. Stripe's
 * `prod_xxx` and `price_xxx`). Read-only from the domain's perspective —
 * mappings are created out-of-band when ops registers a new plan or a new
 * provider, and toggled via `isActive` rather than mutated.
 */
export class ProviderPriceMappingModel extends BaseModel {
  constructor(
    public readonly uuid: UUIDVO,
    public readonly pricingPlanId: number,
    public readonly provider: PaymentProviderCodeVO,
    public readonly externalProductId: string,
    public readonly externalPriceId: string,
    public readonly isActive: boolean,
    public readonly archivedAt: Date | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly id?: number,
  ) {
    super();
  }

  static reconstitute(
    props: ProviderPriceMappingModelReconstituteProps,
  ): ProviderPriceMappingModel {
    return new ProviderPriceMappingModel(
      props.uuid,
      props.pricingPlanId,
      props.provider,
      props.externalProductId,
      props.externalPriceId,
      props.isActive,
      props.archivedAt,
      props.createdAt,
      props.updatedAt,
      props.id,
    );
  }
}

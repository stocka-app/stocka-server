import { BaseModel } from '@shared/domain/base/base.model';
import { UUIDVO } from '@shared/domain/value-objects/compound/uuid.vo';
import { TierVO } from '@tenant/domain/value-objects/tier.vo';
import { BillingCycleVO } from '@billing/domain/value-objects/billing-cycle.vo';
import { MoneyVO } from '@billing/domain/value-objects/money.vo';

export interface PricingPlanModelReconstituteProps {
  id: number;
  uuid: UUIDVO;
  tier: TierVO;
  billingCycle: BillingCycleVO;
  amount: MoneyVO;
  trialDays: number;
  isActive: boolean;
  effectiveFrom: Date;
  effectiveUntil: Date | null;
  metadata: Record<string, unknown> | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Pure data carrier for a PricingPlan — a catalog row that ties a tier and
 * billing cycle to a price point with an effectivity window. Catalog rows
 * are seeded/managed out-of-band (admin tooling in V2; SQL scripts in V1);
 * billing only reads them. There is **no aggregate** for PricingPlan.
 *
 * Multiple rows can coexist for the same (tier, cycle) pair across time
 * — `effectiveFrom`/`effectiveUntil` window them so grandfathered customers
 * keep paying the price they signed up at.
 */
export class PricingPlanModel extends BaseModel {
  constructor(
    public readonly uuid: UUIDVO,
    public readonly tier: TierVO,
    public readonly billingCycle: BillingCycleVO,
    public readonly amount: MoneyVO,
    public readonly trialDays: number,
    public readonly isActive: boolean,
    public readonly effectiveFrom: Date,
    public readonly effectiveUntil: Date | null,
    public readonly metadata: Record<string, unknown> | null,
    public readonly archivedAt: Date | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly id?: number,
  ) {
    super();
  }

  static reconstitute(props: PricingPlanModelReconstituteProps): PricingPlanModel {
    return new PricingPlanModel(
      props.uuid,
      props.tier,
      props.billingCycle,
      props.amount,
      props.trialDays,
      props.isActive,
      props.effectiveFrom,
      props.effectiveUntil,
      props.metadata,
      props.archivedAt,
      props.createdAt,
      props.updatedAt,
      props.id,
    );
  }

  // ── Pure derived queries (no mutation) ────────────────────────────────

  isAvailable(now: Date): boolean {
    return (
      this.isActive &&
      this.effectiveFrom.getTime() <= now.getTime() &&
      (this.effectiveUntil === null || now.getTime() < this.effectiveUntil.getTime())
    );
  }
}

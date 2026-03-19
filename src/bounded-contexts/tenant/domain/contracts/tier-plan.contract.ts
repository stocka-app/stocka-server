import { TierPlanModel } from '@tenant/domain/models/tier-plan.model';
import { TierEnum } from '@shared/domain/policy/tier.enum';

export interface ITierPlanContract {
  findByTier(tier: TierEnum): Promise<TierPlanModel | null>;
  findAll(): Promise<TierPlanModel[]>;
}

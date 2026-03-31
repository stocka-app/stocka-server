import { TierPlanModel } from '@tenant/domain/models/tier-plan.model';
import { TierEnum } from '@authorization/domain/enums/tier.enum';

export interface ITierPlanContract {
  findByTier(tier: TierEnum): Promise<TierPlanModel | null>;
  findAll(): Promise<TierPlanModel[]>;
}

import { TierPlanModel } from '@tenant/domain/models/tier-plan.model';
import { TierPlanEntity } from '@tenant/infrastructure/entities/tier-plan.entity';

export class TierPlanMapper {
  static toDomain(entity: TierPlanEntity): TierPlanModel {
    return TierPlanModel.reconstitute({
      tier: entity.tier,
      name: entity.name,
      maxProducts: entity.maxProducts,
      maxUsers: entity.maxUsers,
      maxWarehouses: entity.maxWarehouses,
      policyVersion: entity.policyVersion,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }
}

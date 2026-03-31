import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ITierPlanContract } from '@tenant/domain/contracts/tier-plan.contract';
import { TierPlanModel } from '@tenant/domain/models/tier-plan.model';
import { TierPlanEntity } from '@tenant/infrastructure/entities/tier-plan.entity';
import { TierPlanMapper } from '@tenant/infrastructure/mappers/tier-plan.mapper';
import { TierEnum } from '@authorization/domain/enums/tier.enum';

@Injectable()
export class TypeOrmTierPlanRepository implements ITierPlanContract {
  constructor(
    @InjectRepository(TierPlanEntity)
    private readonly repository: Repository<TierPlanEntity>,
  ) {}

  async findByTier(tier: TierEnum): Promise<TierPlanModel | null> {
    const entity = await this.repository.findOne({ where: { tier } });
    return entity ? TierPlanMapper.toDomain(entity) : null;
  }

  async findAll(): Promise<TierPlanModel[]> {
    const entities = await this.repository.find();
    return entities.map((entity): TierPlanModel => TierPlanMapper.toDomain(entity));
  }
}

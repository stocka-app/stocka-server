import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ITierDataProvider,
  TierPlanLimits,
  ModulePolicy,
  ActionOverride,
} from '@shared/domain/policy/tier-data-provider.contract';
import { CapabilitySnapshot, isValidSnapshot } from '@shared/domain/policy/capability-snapshot';
import { TierEnum } from '@shared/domain/policy/tier.enum';
import { TierPlanEntity } from '@tenant/infrastructure/entities/tier-plan.entity';
import { TierModulePolicyEntity } from '@tenant/infrastructure/entities/tier-module-policy.entity';
import { TierActionOverrideEntity } from '@tenant/infrastructure/entities/tier-action-override.entity';
import { CatalogActionEntity } from '@tenant/infrastructure/entities/catalog-action.entity';
import { TenantConfigEntity } from '@tenant/infrastructure/entities/tenant-config.entity';

@Injectable()
export class TypeOrmTierDataProvider implements ITierDataProvider {
  constructor(
    @InjectRepository(TierPlanEntity)
    private readonly tierPlanRepo: Repository<TierPlanEntity>,
    @InjectRepository(TierModulePolicyEntity)
    private readonly modulePolicyRepo: Repository<TierModulePolicyEntity>,
    @InjectRepository(TierActionOverrideEntity)
    private readonly actionOverrideRepo: Repository<TierActionOverrideEntity>,
    @InjectRepository(CatalogActionEntity)
    private readonly catalogActionRepo: Repository<CatalogActionEntity>,
    @InjectRepository(TenantConfigEntity)
    private readonly tenantConfigRepo: Repository<TenantConfigEntity>,
  ) {}

  async getSnapshot(tenantId: number): Promise<CapabilitySnapshot | null> {
    const config = await this.tenantConfigRepo.findOne({ where: { tenantId } });
    if (!config || !config.capabilities) {
      return null;
    }

    if (!isValidSnapshot(config.capabilities)) {
      return null;
    }

    return config.capabilities;
  }

  async saveSnapshot(tenantId: number, snapshot: CapabilitySnapshot): Promise<void> {
    const config = await this.tenantConfigRepo.findOneOrFail({ where: { tenantId } });
    config.capabilities = snapshot as Record<string, unknown>;
    config.capabilitiesBuiltAt = new Date();
    await this.tenantConfigRepo.save(config);
  }

  async getTierPlanLimits(tier: TierEnum): Promise<TierPlanLimits | null> {
    const plan = await this.tierPlanRepo.findOne({ where: { tier } });
    if (!plan) {
      return null;
    }

    return {
      maxProducts: plan.maxProducts,
      maxUsers: plan.maxUsers,
      maxWarehouses: plan.maxWarehouses,
      maxCustomRooms: plan.maxCustomRooms,
      maxStoreRooms: plan.maxStoreRooms,
    };
  }

  async getModulePolicies(tier: TierEnum): Promise<ModulePolicy[]> {
    const policies = await this.modulePolicyRepo.find({
      where: { tier },
      relations: ['module'],
    });

    return policies.map((p) => ({
      moduleKey: p.module.key,
      enabled: p.enabled,
      config: p.config,
    }));
  }

  async getActionOverrides(tier: TierEnum): Promise<ActionOverride[]> {
    const overrides = await this.actionOverrideRepo.find({
      where: { tier },
      relations: ['action'],
    });

    return overrides.map((o) => ({
      actionKey: o.action.key,
      enabled: o.enabled,
      config: o.config,
    }));
  }

  async getActionModuleMap(): Promise<Record<string, string>> {
    const actions = await this.catalogActionRepo.find({
      relations: ['module'],
    });

    const map: Record<string, string> = {};
    for (const action of actions) {
      map[action.key] = action.module.key;
    }
    return map;
  }
}

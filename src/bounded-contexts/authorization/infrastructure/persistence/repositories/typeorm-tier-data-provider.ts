import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ITierDataProvider,
  TierPlanLimits,
  ModulePolicy,
  ActionOverride,
} from '@authorization/domain/contracts/tier-data-provider.contract';
import {
  CapabilitySnapshot,
  isValidSnapshot,
} from '@authorization/domain/models/capability-snapshot';
import { TierEnum } from '@authorization/domain/enums/tier.enum';
import { TierPlanEntity } from '@tenant/infrastructure/entities/tier-plan.entity';
import { TierModulePolicyEntity } from '@authorization/infrastructure/persistence/entities/tier-module-policy.entity';
import { TierActionOverrideEntity } from '@authorization/infrastructure/persistence/entities/tier-action-override.entity';
import { CatalogActionEntity } from '@authorization/infrastructure/persistence/entities/catalog-action.entity';
import { CapabilityCacheEntity } from '@authorization/infrastructure/persistence/entities/capability-cache.entity';

@Injectable()
export class TypeOrmTierDataProvider implements ITierDataProvider {
  /**
   * In-memory cache for the action→module mapping.
   * This map is static for the lifetime of a server instance (only changes with deploys),
   * so a singleton cache is safe. Avoids a full table scan on every RBAC evaluation.
   */
  private actionModuleMapCache: Record<string, string> | null = null;

  constructor(
    @InjectRepository(TierPlanEntity)
    private readonly tierPlanRepo: Repository<TierPlanEntity>,
    @InjectRepository(TierModulePolicyEntity)
    private readonly modulePolicyRepo: Repository<TierModulePolicyEntity>,
    @InjectRepository(TierActionOverrideEntity)
    private readonly actionOverrideRepo: Repository<TierActionOverrideEntity>,
    @InjectRepository(CatalogActionEntity)
    private readonly catalogActionRepo: Repository<CatalogActionEntity>,
    @InjectRepository(CapabilityCacheEntity)
    private readonly capabilityCacheRepo: Repository<CapabilityCacheEntity>,
  ) {}

  async getSnapshot(tenantId: number): Promise<CapabilitySnapshot | null> {
    const cache = await this.capabilityCacheRepo.findOne({ where: { tenantId } });
    if (!cache || !cache.capabilities) {
      return null;
    }

    if (!isValidSnapshot(cache.capabilities)) {
      return null;
    }

    return cache.capabilities;
  }

  async saveSnapshot(tenantId: number, snapshot: CapabilitySnapshot): Promise<void> {
    await this.capabilityCacheRepo.save({
      tenantId,
      capabilities: snapshot as Record<string, unknown>,
      capabilitiesBuiltAt: new Date(),
    });
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
    if (this.actionModuleMapCache !== null) {
      return this.actionModuleMapCache;
    }

    const actions = await this.catalogActionRepo.find({
      relations: ['module'],
    });

    const map: Record<string, string> = {};
    for (const action of actions) {
      map[action.key] = action.module.key;
    }

    this.actionModuleMapCache = map;
    return map;
  }
}

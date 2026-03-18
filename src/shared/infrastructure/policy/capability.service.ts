import { Inject, Injectable } from '@nestjs/common';
import { SystemAction } from '@shared/domain/policy/actions-catalog';
import {
  CapabilitySnapshot,
  ActionCapability,
  createEmptySnapshot,
} from '@shared/domain/policy/capability-snapshot';
import { TierEnum } from '@shared/domain/policy/tier.enum';
import {
  ITierDataProvider,
  ModulePolicy,
  ActionOverride,
} from '@shared/domain/policy/tier-data-provider.contract';
import { ACTION_TIER_REQUIREMENTS, TIER_ORDER } from '@shared/domain/policy/tier-policy.config';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

@Injectable()
export class CapabilityService {
  constructor(
    @Inject(INJECTION_TOKENS.TIER_DATA_PROVIDER)
    private readonly tierDataProvider: ITierDataProvider,
  ) {}

  async buildSnapshotForTenant(tier: TierEnum): Promise<CapabilitySnapshot> {
    const snapshot = createEmptySnapshot();

    const [modulePolicies, actionOverrides, actionModuleMap] = await Promise.all([
      this.tierDataProvider.getModulePolicies(tier),
      this.tierDataProvider.getActionOverrides(tier),
      this.tierDataProvider.getActionModuleMap(),
    ]);

    const modulePolicyMap = new Map<string, ModulePolicy>();
    for (const policy of modulePolicies) {
      modulePolicyMap.set(policy.moduleKey, policy);
    }

    const actionOverrideMap = new Map<string, ActionOverride>();
    for (const override of actionOverrides) {
      actionOverrideMap.set(override.actionKey, override);
    }

    for (const action of Object.values(SystemAction)) {
      snapshot[action] = this.resolveAction(
        action,
        tier,
        actionOverrideMap,
        modulePolicyMap,
        actionModuleMap,
      );
    }

    return snapshot;
  }

  async getOrBuildSnapshot(tenantId: number, tier: TierEnum): Promise<CapabilitySnapshot> {
    const existing = await this.tierDataProvider.getSnapshot(tenantId);
    if (existing) {
      return existing;
    }

    const snapshot = await this.buildSnapshotForTenant(tier);
    await this.tierDataProvider.saveSnapshot(tenantId, snapshot);
    return snapshot;
  }

  private resolveAction(
    action: SystemAction,
    tier: TierEnum,
    actionOverrides: Map<string, ActionOverride>,
    modulePolicies: Map<string, ModulePolicy>,
    actionModuleMap: Record<string, string>,
  ): ActionCapability {
    // Priority [3]: explicit action override
    const actionOverride = actionOverrides.get(action);
    if (actionOverride) {
      return {
        enabled: actionOverride.enabled,
        reason: actionOverride.enabled
          ? `Action explicitly enabled for ${tier}`
          : `Action explicitly disabled for ${tier}`,
      };
    }

    // Priority [1]: module-level policy
    const moduleKey = actionModuleMap[action];
    if (moduleKey) {
      const modulePolicy = modulePolicies.get(moduleKey);
      if (modulePolicy && !modulePolicy.enabled) {
        return {
          enabled: false,
          reason: `Module '${moduleKey}' is disabled for ${tier}`,
        };
      }
    }

    // Priority [0]: static tier requirement defaults
    const requiredTier = ACTION_TIER_REQUIREMENTS[action];
    const tierSatisfied = TIER_ORDER[tier] >= TIER_ORDER[requiredTier];

    return {
      enabled: tierSatisfied,
      reason: tierSatisfied
        ? `Tier ${tier} meets the ${requiredTier} requirement`
        : `Action requires ${requiredTier} but tenant is on ${tier}`,
    };
  }
}

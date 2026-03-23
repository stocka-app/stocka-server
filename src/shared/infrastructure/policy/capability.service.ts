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
import { IRbacPolicyPort } from '@shared/domain/policy/rbac-policy.port';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

@Injectable()
export class CapabilityService {
  constructor(
    @Inject(INJECTION_TOKENS.TIER_DATA_PROVIDER)
    private readonly tierDataProvider: ITierDataProvider,
    @Inject(INJECTION_TOKENS.RBAC_POLICY_PORT)
    private readonly rbacPort: IRbacPolicyPort,
  ) {}

  async buildSnapshotForTenant(tier: TierEnum): Promise<CapabilitySnapshot> {
    const snapshot = createEmptySnapshot();

    const [modulePolicies, actionOverrides, actionModuleMap, tierRequirements, tierOrder] =
      await Promise.all([
        this.tierDataProvider.getModulePolicies(tier),
        this.tierDataProvider.getActionOverrides(tier),
        this.tierDataProvider.getActionModuleMap(),
        this.rbacPort.getActionTierRequirements(),
        this.rbacPort.getTierOrder(),
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
        tierRequirements,
        tierOrder,
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
    tierRequirements: Readonly<Record<string, string>>,
    tierOrder: Readonly<Record<string, number>>,
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

    // Priority [0]: tier requirement from DB
    const requiredTier = tierRequirements[action] ?? 'FREE';
    const currentOrder = tierOrder[tier] ?? 0;
    const requiredOrder = tierOrder[requiredTier] ?? 0;
    const tierSatisfied = currentOrder >= requiredOrder;

    return {
      enabled: tierSatisfied,
      reason: tierSatisfied
        ? `Tier ${tier} meets the ${requiredTier} requirement`
        : `Action requires ${requiredTier} but tenant is on ${tier}`,
    };
  }
}

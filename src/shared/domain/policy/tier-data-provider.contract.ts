import { CapabilitySnapshot } from '@shared/domain/policy/capability-snapshot';
import { TierEnum } from '@shared/domain/policy/tier.enum';

export interface TierPlanLimits {
  maxProducts: number | null;
  maxUsers: number | null;
  maxWarehouses: number | null;
}

export interface ModulePolicy {
  moduleKey: string;
  enabled: boolean;
  config: Record<string, unknown> | null;
}

export interface ActionOverride {
  actionKey: string;
  enabled: boolean;
  config: Record<string, unknown> | null;
}

export interface ITierDataProvider {
  getSnapshot(tenantId: number): Promise<CapabilitySnapshot | null>;
  saveSnapshot(tenantId: number, snapshot: CapabilitySnapshot): Promise<void>;
  getTierPlanLimits(tier: TierEnum): Promise<TierPlanLimits | null>;
  getModulePolicies(tier: TierEnum): Promise<ModulePolicy[]>;
  getActionOverrides(tier: TierEnum): Promise<ActionOverride[]>;
  getActionModuleMap(): Promise<Record<string, string>>;
}

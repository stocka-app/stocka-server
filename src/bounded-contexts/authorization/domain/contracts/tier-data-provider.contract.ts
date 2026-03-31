import { CapabilitySnapshot } from '@authorization/domain/models/capability-snapshot';
import { TierEnum } from '@authorization/domain/enums/tier.enum';

export interface TierPlanLimits {
  maxProducts: number | null;
  maxUsers: number | null;
  maxWarehouses: number | null;
  maxCustomRooms: number;
  maxStoreRooms: number;
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

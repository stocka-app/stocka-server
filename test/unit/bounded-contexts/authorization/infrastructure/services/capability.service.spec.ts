import { CapabilityService } from '@authorization/infrastructure/services/capability.service';
import { TierEnum } from '@authorization/domain/enums/tier.enum';
import { SystemAction } from '@authorization/domain/enums/actions-catalog';
import { ITierDataProvider } from '@authorization/domain/contracts/tier-data-provider.contract';
import { IRbacPolicyPort } from '@authorization/domain/contracts/rbac-policy.port';
import { createEmptySnapshot } from '@authorization/domain/models/capability-snapshot';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildTierDataProvider(): jest.Mocked<ITierDataProvider> {
  return {
    getSnapshot: jest.fn(),
    saveSnapshot: jest.fn(),
    getTierPlanLimits: jest.fn(),
    getModulePolicies: jest.fn(),
    getActionOverrides: jest.fn(),
    getActionModuleMap: jest.fn(),
  };
}

function buildRbacPort(): jest.Mocked<IRbacPolicyPort> {
  return {
    getRoleActions: jest.fn(),
    getActionTierRequirements: jest.fn(),
    getTierNumericLimits: jest.fn(),
    getTierOrder: jest.fn(),
    getActionLimitChecks: jest.fn(),
    getAssignableRoles: jest.fn(),
    getUserGrants: jest.fn(),
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('CapabilityService', () => {
  let service: CapabilityService;
  let tierDataProvider: jest.Mocked<ITierDataProvider>;
  let rbacPort: jest.Mocked<IRbacPolicyPort>;

  beforeEach(() => {
    tierDataProvider = buildTierDataProvider();
    rbacPort = buildRbacPort();
    service = new CapabilityService(tierDataProvider, rbacPort);
  });

  describe('Given buildSnapshotForTenant is called for a STARTER tier', () => {
    describe('When there are no module policies and no action overrides', () => {
      beforeEach(() => {
        tierDataProvider.getModulePolicies.mockResolvedValue([]);
        tierDataProvider.getActionOverrides.mockResolvedValue([]);
        tierDataProvider.getActionModuleMap.mockResolvedValue({});
        rbacPort.getActionTierRequirements.mockResolvedValue({});
        rbacPort.getTierOrder.mockResolvedValue({
          FREE: 0,
          STARTER: 1,
          GROWTH: 2,
          ENTERPRISE: 3,
        });
      });

      it('Then it returns a snapshot with all actions resolved via tier order', async () => {
        const snapshot = await service.buildSnapshotForTenant(TierEnum.STARTER);

        expect(snapshot).toBeDefined();
        for (const action of Object.values(SystemAction)) {
          expect(snapshot[action]).toBeDefined();
          expect(typeof snapshot[action].enabled).toBe('boolean');
        }
      });

      it('Then STORAGE_READ defaults to FREE requirement and is enabled for STARTER', async () => {
        rbacPort.getActionTierRequirements.mockResolvedValue({
          [SystemAction.STORAGE_READ]: 'FREE',
        });

        const snapshot = await service.buildSnapshotForTenant(TierEnum.STARTER);

        expect(snapshot[SystemAction.STORAGE_READ].enabled).toBe(true);
        expect(snapshot[SystemAction.STORAGE_READ].reason).toContain('FREE');
      });

      it('Then STORAGE_CREATE requiring GROWTH is disabled for STARTER', async () => {
        rbacPort.getActionTierRequirements.mockResolvedValue({
          [SystemAction.STORAGE_CREATE]: 'GROWTH',
        });

        const snapshot = await service.buildSnapshotForTenant(TierEnum.STARTER);

        expect(snapshot[SystemAction.STORAGE_CREATE].enabled).toBe(false);
        expect(snapshot[SystemAction.STORAGE_CREATE].reason).toContain('GROWTH');
        expect(snapshot[SystemAction.STORAGE_CREATE].reason).toContain('STARTER');
      });
    });

    describe('When an action override is present for STORAGE_CREATE (enabled=true)', () => {
      beforeEach(() => {
        tierDataProvider.getModulePolicies.mockResolvedValue([]);
        tierDataProvider.getActionOverrides.mockResolvedValue([
          { actionKey: SystemAction.STORAGE_CREATE, enabled: true, config: null },
        ]);
        tierDataProvider.getActionModuleMap.mockResolvedValue({});
        rbacPort.getActionTierRequirements.mockResolvedValue({
          [SystemAction.STORAGE_CREATE]: 'ENTERPRISE',
        });
        rbacPort.getTierOrder.mockResolvedValue({
          FREE: 0,
          STARTER: 1,
          GROWTH: 2,
          ENTERPRISE: 3,
        });
      });

      it('Then STORAGE_CREATE is enabled regardless of tier requirement', async () => {
        const snapshot = await service.buildSnapshotForTenant(TierEnum.STARTER);

        expect(snapshot[SystemAction.STORAGE_CREATE].enabled).toBe(true);
        expect(snapshot[SystemAction.STORAGE_CREATE].reason).toContain('explicitly enabled');
      });
    });

    describe('When an action override is present for STORAGE_CREATE (enabled=false)', () => {
      beforeEach(() => {
        tierDataProvider.getModulePolicies.mockResolvedValue([]);
        tierDataProvider.getActionOverrides.mockResolvedValue([
          { actionKey: SystemAction.STORAGE_CREATE, enabled: false, config: null },
        ]);
        tierDataProvider.getActionModuleMap.mockResolvedValue({});
        rbacPort.getActionTierRequirements.mockResolvedValue({});
        rbacPort.getTierOrder.mockResolvedValue({ FREE: 0, STARTER: 1 });
      });

      it('Then STORAGE_CREATE is disabled and reason mentions explicitly disabled', async () => {
        const snapshot = await service.buildSnapshotForTenant(TierEnum.STARTER);

        expect(snapshot[SystemAction.STORAGE_CREATE].enabled).toBe(false);
        expect(snapshot[SystemAction.STORAGE_CREATE].reason).toContain('explicitly disabled');
      });
    });

    describe('When a module policy disables the storage module', () => {
      beforeEach(() => {
        tierDataProvider.getModulePolicies.mockResolvedValue([
          { moduleKey: 'storage', enabled: false, config: null },
        ]);
        tierDataProvider.getActionOverrides.mockResolvedValue([]);
        tierDataProvider.getActionModuleMap.mockResolvedValue({
          [SystemAction.STORAGE_CREATE]: 'storage',
          [SystemAction.STORAGE_READ]: 'storage',
        });
        rbacPort.getActionTierRequirements.mockResolvedValue({});
        rbacPort.getTierOrder.mockResolvedValue({ FREE: 0, STARTER: 1 });
      });

      it('Then storage actions are disabled via module policy', async () => {
        const snapshot = await service.buildSnapshotForTenant(TierEnum.STARTER);

        expect(snapshot[SystemAction.STORAGE_CREATE].enabled).toBe(false);
        expect(snapshot[SystemAction.STORAGE_CREATE].reason).toContain(
          "Module 'storage' is disabled",
        );
        expect(snapshot[SystemAction.STORAGE_READ].enabled).toBe(false);
      });
    });

    describe('When a module policy exists but is enabled', () => {
      beforeEach(() => {
        tierDataProvider.getModulePolicies.mockResolvedValue([
          { moduleKey: 'storage', enabled: true, config: null },
        ]);
        tierDataProvider.getActionOverrides.mockResolvedValue([]);
        tierDataProvider.getActionModuleMap.mockResolvedValue({
          [SystemAction.STORAGE_READ]: 'storage',
        });
        rbacPort.getActionTierRequirements.mockResolvedValue({
          [SystemAction.STORAGE_READ]: 'FREE',
        });
        rbacPort.getTierOrder.mockResolvedValue({ FREE: 0, STARTER: 1 });
      });

      it('Then it falls through to tier check and action is enabled', async () => {
        const snapshot = await service.buildSnapshotForTenant(TierEnum.STARTER);

        expect(snapshot[SystemAction.STORAGE_READ].enabled).toBe(true);
      });
    });

    describe('When the action tier and current tier are both unknown in the order map', () => {
      beforeEach(() => {
        tierDataProvider.getModulePolicies.mockResolvedValue([]);
        tierDataProvider.getActionOverrides.mockResolvedValue([]);
        tierDataProvider.getActionModuleMap.mockResolvedValue({});
        // tierRequirements maps the action to an unknown tier key not in tierOrder
        rbacPort.getActionTierRequirements.mockResolvedValue({
          [SystemAction.STORAGE_READ]: 'UNKNOWN_TIER',
        });
        // tierOrder does NOT contain STARTER or UNKNOWN_TIER → both default to 0
        rbacPort.getTierOrder.mockResolvedValue({ FREE: 0 });
      });

      it('Then actions resolve with currentOrder 0 and requiredOrder 0 (both satisfied)', async () => {
        // TierEnum.STARTER is not in tierOrder → currentOrder defaults to 0
        // 'UNKNOWN_TIER' is not in tierOrder → requiredOrder defaults to 0
        // 0 >= 0 === true → enabled
        const snapshot = await service.buildSnapshotForTenant(TierEnum.STARTER);

        expect(snapshot[SystemAction.STORAGE_READ].enabled).toBe(true);
      });
    });
  });

  describe('Given getOrBuildSnapshot is called', () => {
    describe('When a cached snapshot already exists', () => {
      beforeEach(() => {
        const cachedSnapshot = createEmptySnapshot();
        cachedSnapshot[SystemAction.STORAGE_READ] = { enabled: true, reason: 'cached' };
        tierDataProvider.getSnapshot.mockResolvedValue(cachedSnapshot);
      });

      it('Then it returns the cached snapshot without rebuilding', async () => {
        const snapshot = await service.getOrBuildSnapshot(42, TierEnum.STARTER);

        expect(snapshot[SystemAction.STORAGE_READ]).toEqual({ enabled: true, reason: 'cached' });
        expect(tierDataProvider.getModulePolicies).not.toHaveBeenCalled();
      });
    });

    describe('When no cached snapshot exists', () => {
      beforeEach(() => {
        tierDataProvider.getSnapshot.mockResolvedValue(null);
        tierDataProvider.getModulePolicies.mockResolvedValue([]);
        tierDataProvider.getActionOverrides.mockResolvedValue([]);
        tierDataProvider.getActionModuleMap.mockResolvedValue({});
        tierDataProvider.saveSnapshot.mockResolvedValue(undefined);
        rbacPort.getActionTierRequirements.mockResolvedValue({});
        rbacPort.getTierOrder.mockResolvedValue({ FREE: 0, STARTER: 1 });
      });

      it('Then it builds a new snapshot and saves it', async () => {
        const snapshot = await service.getOrBuildSnapshot(42, TierEnum.STARTER);

        expect(snapshot).toBeDefined();
        expect(tierDataProvider.saveSnapshot).toHaveBeenCalledWith(42, expect.any(Object));
      });
    });
  });
});

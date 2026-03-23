import { Test, TestingModule } from '@nestjs/testing';
import { CapabilityService } from '@shared/infrastructure/policy/capability.service';
import { SystemAction } from '@shared/domain/policy/actions-catalog';
import { TierEnum } from '@shared/domain/policy/tier.enum';
import {
  ITierDataProvider,
  ModulePolicy,
  ActionOverride,
} from '@shared/domain/policy/tier-data-provider.contract';
import { CapabilitySnapshot, createEmptySnapshot } from '@shared/domain/policy/capability-snapshot';
import { IRbacPolicyPort } from '@shared/domain/policy/rbac-policy.port';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

describe('CapabilityService', () => {
  let service: CapabilityService;
  let tierDataProvider: jest.Mocked<ITierDataProvider>;

  const DEFAULT_ACTION_MODULE_MAP: Record<string, string> = {
    [SystemAction.STORAGE_CREATE]: 'storages',
    [SystemAction.STORAGE_READ]: 'storages',
    [SystemAction.STORAGE_UPDATE]: 'storages',
    [SystemAction.STORAGE_DELETE]: 'storages',
    [SystemAction.MEMBER_INVITE]: 'team',
    [SystemAction.MEMBER_READ]: 'team',
    [SystemAction.MEMBER_UPDATE_ROLE]: 'team',
    [SystemAction.MEMBER_REMOVE]: 'team',
    [SystemAction.PRODUCT_CREATE]: 'inventory',
    [SystemAction.PRODUCT_READ]: 'inventory',
    [SystemAction.PRODUCT_UPDATE]: 'inventory',
    [SystemAction.PRODUCT_DELETE]: 'inventory',
    [SystemAction.REPORT_READ]: 'reports',
    [SystemAction.REPORT_ADVANCED]: 'reports',
    [SystemAction.INVENTORY_EXPORT]: 'inventory',
    [SystemAction.TENANT_SETTINGS_READ]: 'settings',
    [SystemAction.TENANT_SETTINGS_UPDATE]: 'settings',
  };

  const ACTION_TIER_REQUIREMENTS: Record<string, string> = {
    [SystemAction.STORAGE_CREATE]: TierEnum.STARTER,
    [SystemAction.STORAGE_READ]: TierEnum.FREE,
    [SystemAction.STORAGE_UPDATE]: TierEnum.STARTER,
    [SystemAction.STORAGE_DELETE]: TierEnum.STARTER,
    [SystemAction.MEMBER_INVITE]: TierEnum.STARTER,
    [SystemAction.MEMBER_READ]: TierEnum.FREE,
    [SystemAction.MEMBER_UPDATE_ROLE]: TierEnum.STARTER,
    [SystemAction.MEMBER_REMOVE]: TierEnum.STARTER,
    [SystemAction.PRODUCT_CREATE]: TierEnum.FREE,
    [SystemAction.PRODUCT_READ]: TierEnum.FREE,
    [SystemAction.PRODUCT_UPDATE]: TierEnum.FREE,
    [SystemAction.PRODUCT_DELETE]: TierEnum.FREE,
    [SystemAction.REPORT_READ]: TierEnum.FREE,
    [SystemAction.REPORT_ADVANCED]: TierEnum.GROWTH,
    [SystemAction.INVENTORY_EXPORT]: TierEnum.STARTER,
    [SystemAction.TENANT_SETTINGS_READ]: TierEnum.FREE,
    [SystemAction.TENANT_SETTINGS_UPDATE]: TierEnum.FREE,
  };

  const TIER_ORDER: Record<string, number> = {
    [TierEnum.FREE]: 0,
    [TierEnum.STARTER]: 1,
    [TierEnum.GROWTH]: 2,
    [TierEnum.ENTERPRISE]: 3,
  };

  const mockRbacPort: jest.Mocked<IRbacPolicyPort> = {
    getRoleActions: jest.fn(),
    getActionTierRequirements: jest.fn().mockResolvedValue(ACTION_TIER_REQUIREMENTS),
    getTierNumericLimits: jest.fn(),
    getTierOrder: jest.fn().mockResolvedValue(TIER_ORDER),
    getActionLimitChecks: jest.fn(),
    getAssignableRoles: jest.fn(),
    getUserGrants: jest.fn(),
  };

  beforeEach(async () => {
    tierDataProvider = {
      getSnapshot: jest.fn().mockResolvedValue(null),
      saveSnapshot: jest.fn().mockResolvedValue(undefined),
      getTierPlanLimits: jest.fn().mockResolvedValue(null),
      getModulePolicies: jest.fn().mockResolvedValue([]),
      getActionOverrides: jest.fn().mockResolvedValue([]),
      getActionModuleMap: jest.fn().mockResolvedValue(DEFAULT_ACTION_MODULE_MAP),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CapabilityService,
        { provide: INJECTION_TOKENS.TIER_DATA_PROVIDER, useValue: tierDataProvider },
        { provide: INJECTION_TOKENS.RBAC_POLICY_PORT, useValue: mockRbacPort },
      ],
    }).compile();

    service = module.get<CapabilityService>(CapabilityService);
  });

  // ── buildSnapshotForTenant ──────────────────────────────────────────────────

  describe('Given a FREE tier tenant with no overrides or module policies', () => {
    describe('When building a snapshot', () => {
      let snapshot: CapabilitySnapshot;

      beforeEach(async () => {
        snapshot = await service.buildSnapshotForTenant(TierEnum.FREE);
      });

      it('Then FREE-tier actions like PRODUCT_READ are enabled', () => {
        expect(snapshot[SystemAction.PRODUCT_READ].enabled).toBe(true);
      });

      it('Then STARTER-tier actions like STORAGE_CREATE are disabled', () => {
        expect(snapshot[SystemAction.STORAGE_CREATE].enabled).toBe(false);
      });

      it('Then GROWTH-tier actions like REPORT_ADVANCED are disabled', () => {
        expect(snapshot[SystemAction.REPORT_ADVANCED].enabled).toBe(false);
      });

      it('Then the snapshot has an entry for every SystemAction', () => {
        const allActions = Object.values(SystemAction);
        for (const action of allActions) {
          expect(snapshot[action]).toBeDefined();
          expect(typeof snapshot[action].enabled).toBe('boolean');
        }
      });
    });
  });

  describe('Given a FREE tier tenant with a disabled storages module policy', () => {
    beforeEach(() => {
      const modulePolicies: ModulePolicy[] = [
        { moduleKey: 'storages', enabled: false, config: null },
      ];
      tierDataProvider.getModulePolicies.mockResolvedValue(modulePolicies);
    });

    describe('When building a snapshot', () => {
      it('Then STORAGE_READ is disabled because the module is disabled', async () => {
        const snapshot = await service.buildSnapshotForTenant(TierEnum.FREE);
        expect(snapshot[SystemAction.STORAGE_READ].enabled).toBe(false);
        expect(snapshot[SystemAction.STORAGE_READ].reason).toContain(
          "Module 'storages' is disabled",
        );
      });
    });
  });

  describe('Given a STARTER tier tenant with an action override', () => {
    beforeEach(() => {
      const overrides: ActionOverride[] = [
        { actionKey: SystemAction.REPORT_ADVANCED, enabled: true, config: null },
      ];
      tierDataProvider.getActionOverrides.mockResolvedValue(overrides);
    });

    describe('When building a snapshot', () => {
      it('Then REPORT_ADVANCED is enabled due to the override', async () => {
        const snapshot = await service.buildSnapshotForTenant(TierEnum.STARTER);
        expect(snapshot[SystemAction.REPORT_ADVANCED].enabled).toBe(true);
        expect(snapshot[SystemAction.REPORT_ADVANCED].reason).toContain('explicitly enabled');
      });
    });
  });

  describe('Given a GROWTH tier tenant with an explicit disable override on PRODUCT_DELETE', () => {
    beforeEach(() => {
      const overrides: ActionOverride[] = [
        { actionKey: SystemAction.PRODUCT_DELETE, enabled: false, config: null },
      ];
      tierDataProvider.getActionOverrides.mockResolvedValue(overrides);
    });

    describe('When building a snapshot', () => {
      it('Then PRODUCT_DELETE is disabled despite tier access', async () => {
        const snapshot = await service.buildSnapshotForTenant(TierEnum.GROWTH);
        expect(snapshot[SystemAction.PRODUCT_DELETE].enabled).toBe(false);
        expect(snapshot[SystemAction.PRODUCT_DELETE].reason).toContain('explicitly disabled');
      });

      it('Then other actions are not affected by the override', async () => {
        const snapshot = await service.buildSnapshotForTenant(TierEnum.GROWTH);
        expect(snapshot[SystemAction.PRODUCT_CREATE].enabled).toBe(true);
        expect(snapshot[SystemAction.PRODUCT_READ].enabled).toBe(true);
      });
    });
  });

  describe('Given an ENTERPRISE tier tenant with no restrictions', () => {
    describe('When building a snapshot', () => {
      it('Then all actions are enabled', async () => {
        const snapshot = await service.buildSnapshotForTenant(TierEnum.ENTERPRISE);
        const allActions = Object.values(SystemAction);
        for (const action of allActions) {
          expect(snapshot[action].enabled).toBe(true);
        }
      });
    });
  });

  describe('Given override takes priority over module policy', () => {
    beforeEach(() => {
      const modulePolicies: ModulePolicy[] = [
        { moduleKey: 'storages', enabled: false, config: null },
      ];
      const overrides: ActionOverride[] = [
        { actionKey: SystemAction.STORAGE_READ, enabled: true, config: null },
      ];
      tierDataProvider.getModulePolicies.mockResolvedValue(modulePolicies);
      tierDataProvider.getActionOverrides.mockResolvedValue(overrides);
    });

    describe('When building a snapshot', () => {
      it('Then the action override wins over the module policy', async () => {
        const snapshot = await service.buildSnapshotForTenant(TierEnum.FREE);
        expect(snapshot[SystemAction.STORAGE_READ].enabled).toBe(true);
        expect(snapshot[SystemAction.STORAGE_READ].reason).toContain('explicitly enabled');
      });
    });
  });

  // ── getOrBuildSnapshot ──────────────────────────────────────────────────────

  describe('Given a tenant with an existing cached snapshot', () => {
    let cachedSnapshot: CapabilitySnapshot;

    beforeEach(() => {
      cachedSnapshot = createEmptySnapshot();
      cachedSnapshot[SystemAction.PRODUCT_READ] = { enabled: true, reason: 'Cached' };
      tierDataProvider.getSnapshot.mockResolvedValue(cachedSnapshot);
    });

    describe('When getOrBuildSnapshot is called', () => {
      it('Then it returns the cached snapshot without rebuilding', async () => {
        const result = await service.getOrBuildSnapshot(1, TierEnum.FREE);
        expect(result).toBe(cachedSnapshot);
        expect(tierDataProvider.getModulePolicies).not.toHaveBeenCalled();
        expect(tierDataProvider.getActionOverrides).not.toHaveBeenCalled();
      });
    });
  });

  describe('Given a tenant with no cached snapshot', () => {
    beforeEach(() => {
      tierDataProvider.getSnapshot.mockResolvedValue(null);
    });

    describe('When getOrBuildSnapshot is called', () => {
      it('Then it builds a new snapshot and saves it', async () => {
        const result = await service.getOrBuildSnapshot(1, TierEnum.FREE);
        expect(result).toBeDefined();
        expect(tierDataProvider.saveSnapshot).toHaveBeenCalledWith(1, result);
      });

      it('Then the snapshot contains valid entries for all actions', async () => {
        const result = await service.getOrBuildSnapshot(1, TierEnum.STARTER);
        const allActions = Object.values(SystemAction);
        for (const action of allActions) {
          expect(typeof result[action].enabled).toBe('boolean');
        }
      });
    });
  });

  describe('Given an action with no module mapping', () => {
    beforeEach(() => {
      tierDataProvider.getActionModuleMap.mockResolvedValue({});
    });

    describe('When building a snapshot', () => {
      it('Then the action falls back to static tier requirements', async () => {
        const snapshot = await service.buildSnapshotForTenant(TierEnum.FREE);
        expect(snapshot[SystemAction.PRODUCT_READ].enabled).toBe(true);
        expect(snapshot[SystemAction.PRODUCT_READ].reason).toContain('meets the FREE requirement');
      });
    });
  });

  describe('Given both tier requirements and tier order maps return no data for the action or tier', () => {
    beforeEach(() => {
      mockRbacPort.getActionTierRequirements.mockResolvedValueOnce({});
      mockRbacPort.getTierOrder.mockResolvedValueOnce({});
      tierDataProvider.getActionModuleMap.mockResolvedValue({});
    });

    describe('When building a snapshot for any tier', () => {
      it('Then all actions default to enabled because both orders fall back to 0', async () => {
        const snapshot = await service.buildSnapshotForTenant(TierEnum.STARTER);
        const allActions = Object.values(SystemAction);
        for (const action of allActions) {
          expect(snapshot[action].enabled).toBe(true);
        }
      });
    });
  });
});

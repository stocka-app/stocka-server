import { Repository } from 'typeorm';
import { TypeOrmTierDataProvider } from '@authorization/infrastructure/persistence/repositories/typeorm-tier-data-provider';
import { TierPlanEntity } from '@tenant/infrastructure/entities/tier-plan.entity';
import { TierModulePolicyEntity } from '@authorization/infrastructure/persistence/entities/tier-module-policy.entity';
import { TierActionOverrideEntity } from '@authorization/infrastructure/persistence/entities/tier-action-override.entity';
import { CatalogActionEntity } from '@authorization/infrastructure/persistence/entities/catalog-action.entity';
import { CapabilityCacheEntity } from '@authorization/infrastructure/persistence/entities/capability-cache.entity';
import { TierEnum } from '@authorization/domain/enums/tier.enum';
import { SystemAction } from '@authorization/domain/enums/actions-catalog';
import { createEmptySnapshot } from '@authorization/domain/models/capability-snapshot';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildRepo<T extends object>(): jest.Mocked<Repository<T>> {
  return {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
  } as unknown as jest.Mocked<Repository<T>>;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('TypeOrmTierDataProvider', () => {
  let provider: TypeOrmTierDataProvider;
  let tierPlanRepo: jest.Mocked<Repository<TierPlanEntity>>;
  let modulePolicyRepo: jest.Mocked<Repository<TierModulePolicyEntity>>;
  let actionOverrideRepo: jest.Mocked<Repository<TierActionOverrideEntity>>;
  let catalogActionRepo: jest.Mocked<Repository<CatalogActionEntity>>;
  let capabilityCacheRepo: jest.Mocked<Repository<CapabilityCacheEntity>>;

  beforeEach(() => {
    tierPlanRepo = buildRepo<TierPlanEntity>();
    modulePolicyRepo = buildRepo<TierModulePolicyEntity>();
    actionOverrideRepo = buildRepo<TierActionOverrideEntity>();
    catalogActionRepo = buildRepo<CatalogActionEntity>();
    capabilityCacheRepo = buildRepo<CapabilityCacheEntity>();

    provider = new TypeOrmTierDataProvider(
      tierPlanRepo,
      modulePolicyRepo,
      actionOverrideRepo,
      catalogActionRepo,
      capabilityCacheRepo,
    );
  });

  // ─── getSnapshot ──────────────────────────────────────────────────────────

  describe('Given getSnapshot is called', () => {
    describe('When no cache entry exists for the tenant', () => {
      beforeEach(() => {
        capabilityCacheRepo.findOne.mockResolvedValue(null);
      });

      it('Then it returns null', async () => {
        const result = await provider.getSnapshot(1);
        expect(result).toBeNull();
      });
    });

    describe('When a cache entry exists but capabilities is null', () => {
      beforeEach(() => {
        capabilityCacheRepo.findOne.mockResolvedValue({
          tenantId: 1,
          capabilities: null,
          capabilitiesBuiltAt: null,
        });
      });

      it('Then it returns null', async () => {
        const result = await provider.getSnapshot(1);
        expect(result).toBeNull();
      });
    });

    describe('When a cache entry exists with invalid capabilities structure', () => {
      beforeEach(() => {
        capabilityCacheRepo.findOne.mockResolvedValue({
          tenantId: 1,
          capabilities: { not: 'a-valid-snapshot' },
          capabilitiesBuiltAt: new Date(),
        });
      });

      it('Then it returns null', async () => {
        const result = await provider.getSnapshot(1);
        expect(result).toBeNull();
      });
    });

    describe('When a cache entry exists with a valid snapshot', () => {
      let validSnapshot: Record<string, unknown>;

      beforeEach(() => {
        const snap = createEmptySnapshot();
        validSnapshot = snap as unknown as Record<string, unknown>;
        capabilityCacheRepo.findOne.mockResolvedValue({
          tenantId: 1,
          capabilities: validSnapshot,
          capabilitiesBuiltAt: new Date(),
        });
      });

      it('Then it returns the deserialized snapshot', async () => {
        const result = await provider.getSnapshot(1);
        expect(result).not.toBeNull();
        expect(result).toEqual(validSnapshot);
      });
    });
  });

  // ─── saveSnapshot ────────────────────────────────────────────────────────

  describe('Given saveSnapshot is called', () => {
    describe('When saving a valid snapshot for a tenant', () => {
      beforeEach(() => {
        capabilityCacheRepo.save.mockResolvedValue({} as CapabilityCacheEntity);
      });

      it('Then it persists the snapshot with correct tenantId', async () => {
        const snapshot = createEmptySnapshot();
        await provider.saveSnapshot(99, snapshot);

        expect(capabilityCacheRepo.save).toHaveBeenCalledWith(
          expect.objectContaining({ tenantId: 99 }),
        );
      });

      it('Then it sets capabilitiesBuiltAt to a recent date', async () => {
        const before = new Date();
        const snapshot = createEmptySnapshot();
        await provider.saveSnapshot(99, snapshot);
        const after = new Date();

        const savedArg = (capabilityCacheRepo.save as jest.Mock).mock.calls[0][0] as {
          capabilitiesBuiltAt: Date;
        };
        expect(savedArg.capabilitiesBuiltAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
        expect(savedArg.capabilitiesBuiltAt.getTime()).toBeLessThanOrEqual(after.getTime());
      });
    });
  });

  // ─── getTierPlanLimits ───────────────────────────────────────────────────

  describe('Given getTierPlanLimits is called', () => {
    describe('When the tier plan does not exist', () => {
      beforeEach(() => {
        tierPlanRepo.findOne.mockResolvedValue(null);
      });

      it('Then it returns null', async () => {
        const result = await provider.getTierPlanLimits(TierEnum.FREE);
        expect(result).toBeNull();
      });
    });

    describe('When the tier plan exists', () => {
      beforeEach(() => {
        tierPlanRepo.findOne.mockResolvedValue({
          id: 1,
          tier: TierEnum.STARTER,
          maxProducts: 1000,
          maxUsers: 5,
          maxWarehouses: 3,
          maxCustomRooms: 10,
          maxStoreRooms: 5,
        } as TierPlanEntity);
      });

      it('Then it returns the correct limits', async () => {
        const result = await provider.getTierPlanLimits(TierEnum.STARTER);

        expect(result).toEqual({
          maxProducts: 1000,
          maxUsers: 5,
          maxWarehouses: 3,
          maxCustomRooms: 10,
          maxStoreRooms: 5,
        });
      });
    });
  });

  // ─── getModulePolicies ───────────────────────────────────────────────────

  describe('Given getModulePolicies is called', () => {
    describe('When there are no policies for the tier', () => {
      beforeEach(() => {
        modulePolicyRepo.find.mockResolvedValue([]);
      });

      it('Then it returns an empty array', async () => {
        const result = await provider.getModulePolicies(TierEnum.FREE);
        expect(result).toEqual([]);
      });
    });

    describe('When policies exist for the tier', () => {
      beforeEach(() => {
        modulePolicyRepo.find.mockResolvedValue([
          {
            tier: TierEnum.STARTER,
            moduleId: 1,
            enabled: false,
            config: null,
            module: { id: 1, key: 'storage', label: 'Storage' },
          } as unknown as TierModulePolicyEntity,
        ]);
      });

      it('Then it returns mapped policies', async () => {
        const result = await provider.getModulePolicies(TierEnum.STARTER);

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({ moduleKey: 'storage', enabled: false, config: null });
      });
    });
  });

  // ─── getActionOverrides ──────────────────────────────────────────────────

  describe('Given getActionOverrides is called', () => {
    describe('When there are no overrides for the tier', () => {
      beforeEach(() => {
        actionOverrideRepo.find.mockResolvedValue([]);
      });

      it('Then it returns an empty array', async () => {
        const result = await provider.getActionOverrides(TierEnum.FREE);
        expect(result).toEqual([]);
      });
    });

    describe('When overrides exist for the tier', () => {
      beforeEach(() => {
        actionOverrideRepo.find.mockResolvedValue([
          {
            tier: TierEnum.STARTER,
            actionId: 1,
            enabled: true,
            config: { limit: 3 },
            action: { id: 1, key: SystemAction.STORAGE_CREATE, label: 'Create storage' },
          } as unknown as TierActionOverrideEntity,
        ]);
      });

      it('Then it returns mapped overrides', async () => {
        const result = await provider.getActionOverrides(TierEnum.STARTER);

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
          actionKey: SystemAction.STORAGE_CREATE,
          enabled: true,
          config: { limit: 3 },
        });
      });
    });
  });

  // ─── getActionModuleMap ──────────────────────────────────────────────────

  describe('Given getActionModuleMap is called', () => {
    describe('When no catalog actions exist', () => {
      beforeEach(() => {
        catalogActionRepo.find.mockResolvedValue([]);
      });

      it('Then it returns an empty map', async () => {
        const result = await provider.getActionModuleMap();
        expect(result).toEqual({});
      });
    });

    describe('When catalog actions with module associations exist', () => {
      beforeEach(() => {
        catalogActionRepo.find.mockResolvedValue([
          {
            id: 1,
            key: SystemAction.STORAGE_CREATE,
            label: 'Create storage',
            module: { id: 1, key: 'storage', label: 'Storage' },
          } as unknown as CatalogActionEntity,
          {
            id: 2,
            key: SystemAction.MEMBER_INVITE,
            label: 'Invite member',
            module: { id: 2, key: 'members', label: 'Members' },
          } as unknown as CatalogActionEntity,
        ]);
      });

      it('Then it returns a correct action-to-module map', async () => {
        const result = await provider.getActionModuleMap();

        expect(result).toEqual({
          [SystemAction.STORAGE_CREATE]: 'storage',
          [SystemAction.MEMBER_INVITE]: 'members',
        });
      });

      it('Then the second call returns from the in-memory cache without hitting the DB again', async () => {
        await provider.getActionModuleMap();
        const second = await provider.getActionModuleMap();

        expect(catalogActionRepo.find).toHaveBeenCalledTimes(1);
        expect(second).toEqual({
          [SystemAction.STORAGE_CREATE]: 'storage',
          [SystemAction.MEMBER_INVITE]: 'members',
        });
      });
    });
  });
});

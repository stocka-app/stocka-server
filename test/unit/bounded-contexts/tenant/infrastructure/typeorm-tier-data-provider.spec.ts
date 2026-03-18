import { Repository } from 'typeorm';
import { TypeOrmTierDataProvider } from '@tenant/infrastructure/repositories/typeorm-tier-data-provider';
import { TierPlanEntity } from '@tenant/infrastructure/entities/tier-plan.entity';
import { TierModulePolicyEntity } from '@tenant/infrastructure/entities/tier-module-policy.entity';
import { TierActionOverrideEntity } from '@tenant/infrastructure/entities/tier-action-override.entity';
import { CatalogActionEntity } from '@tenant/infrastructure/entities/catalog-action.entity';
import { TenantConfigEntity } from '@tenant/infrastructure/entities/tenant-config.entity';
import { TierEnum } from '@shared/domain/policy/tier.enum';
import { SystemAction } from '@shared/domain/policy/actions-catalog';
import { createEmptySnapshot } from '@shared/domain/policy/capability-snapshot';

const makeMockRepo = <T extends object>(): jest.Mocked<Repository<T>> =>
  ({
    findOne: jest.fn(),
    findOneOrFail: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
  }) as unknown as jest.Mocked<Repository<T>>;

describe('TypeOrmTierDataProvider', () => {
  let provider: TypeOrmTierDataProvider;
  let tierPlanRepo: jest.Mocked<Repository<TierPlanEntity>>;
  let modulePolicyRepo: jest.Mocked<Repository<TierModulePolicyEntity>>;
  let actionOverrideRepo: jest.Mocked<Repository<TierActionOverrideEntity>>;
  let catalogActionRepo: jest.Mocked<Repository<CatalogActionEntity>>;
  let tenantConfigRepo: jest.Mocked<Repository<TenantConfigEntity>>;

  beforeEach(() => {
    tierPlanRepo = makeMockRepo<TierPlanEntity>();
    modulePolicyRepo = makeMockRepo<TierModulePolicyEntity>();
    actionOverrideRepo = makeMockRepo<TierActionOverrideEntity>();
    catalogActionRepo = makeMockRepo<CatalogActionEntity>();
    tenantConfigRepo = makeMockRepo<TenantConfigEntity>();

    provider = new TypeOrmTierDataProvider(
      tierPlanRepo,
      modulePolicyRepo,
      actionOverrideRepo,
      catalogActionRepo,
      tenantConfigRepo,
    );
  });

  // ── getSnapshot ─────────────────────────────────────────────────────────────

  describe('Given a tenant with a valid capabilities snapshot in the database', () => {
    describe('When getSnapshot is called', () => {
      it('Then it returns the stored snapshot', async () => {
        const snapshot = createEmptySnapshot();
        snapshot[SystemAction.PRODUCT_CREATE] = { enabled: true };

        tenantConfigRepo.findOne.mockResolvedValue({
          capabilities: snapshot as unknown as Record<string, unknown>,
        } as TenantConfigEntity);

        const result = await provider.getSnapshot(1);

        expect(result).not.toBeNull();
        expect(result?.[SystemAction.PRODUCT_CREATE].enabled).toBe(true);
      });
    });
  });

  describe('Given a tenant with no capabilities in the database', () => {
    describe('When getSnapshot is called', () => {
      it('Then it returns null', async () => {
        tenantConfigRepo.findOne.mockResolvedValue({
          capabilities: null,
        } as TenantConfigEntity);

        const result = await provider.getSnapshot(1);

        expect(result).toBeNull();
      });
    });
  });

  describe('Given the tenant config row does not exist', () => {
    describe('When getSnapshot is called', () => {
      it('Then it returns null', async () => {
        tenantConfigRepo.findOne.mockResolvedValue(null);

        const result = await provider.getSnapshot(99);

        expect(result).toBeNull();
      });
    });
  });

  describe('Given a tenant with a corrupted capabilities JSONB', () => {
    describe('When getSnapshot is called', () => {
      it('Then it returns null and does not throw', async () => {
        tenantConfigRepo.findOne.mockResolvedValue({
          capabilities: { not_a_valid_snapshot: true },
        } as unknown as TenantConfigEntity);

        const result = await provider.getSnapshot(1);

        expect(result).toBeNull();
      });
    });
  });

  // ── saveSnapshot ────────────────────────────────────────────────────────────

  describe('Given a tenant config exists', () => {
    describe('When saveSnapshot is called with a valid snapshot', () => {
      it('Then the snapshot is persisted and the timestamp is updated', async () => {
        const configEntity = {
          tenantId: 1,
          capabilities: null,
          capabilitiesBuiltAt: null,
        } as TenantConfigEntity;

        tenantConfigRepo.findOneOrFail.mockResolvedValue(configEntity);
        tenantConfigRepo.save.mockResolvedValue(configEntity);

        const snapshot = createEmptySnapshot();
        await provider.saveSnapshot(1, snapshot);

        expect(tenantConfigRepo.save).toHaveBeenCalledTimes(1);
        expect(configEntity.capabilitiesBuiltAt).toBeInstanceOf(Date);
      });
    });
  });

  // ── getTierPlanLimits ───────────────────────────────────────────────────────

  describe('Given a STARTER tier plan exists', () => {
    describe('When getTierPlanLimits is called', () => {
      it('Then it returns the limits from the database', async () => {
        tierPlanRepo.findOne.mockResolvedValue({
          tier: 'STARTER',
          maxProducts: 1000,
          maxUsers: 5,
          maxWarehouses: 3,
        } as TierPlanEntity);

        const limits = await provider.getTierPlanLimits(TierEnum.STARTER);

        expect(limits).not.toBeNull();
        expect(limits?.maxProducts).toBe(1000);
        expect(limits?.maxUsers).toBe(5);
        expect(limits?.maxWarehouses).toBe(3);
      });
    });
  });

  describe('Given no tier plan exists for the requested tier', () => {
    describe('When getTierPlanLimits is called', () => {
      it('Then it returns null', async () => {
        tierPlanRepo.findOne.mockResolvedValue(null);

        const limits = await provider.getTierPlanLimits(TierEnum.FREE);

        expect(limits).toBeNull();
      });
    });
  });

  // ── getModulePolicies ───────────────────────────────────────────────────────

  describe('Given module policies exist for FREE tier', () => {
    describe('When getModulePolicies is called', () => {
      it('Then it returns mapped module policies', async () => {
        modulePolicyRepo.find.mockResolvedValue([
          {
            tier: 'FREE',
            enabled: false,
            config: null,
            module: { key: 'storages' },
          } as TierModulePolicyEntity,
        ]);

        const policies = await provider.getModulePolicies(TierEnum.FREE);

        expect(policies).toHaveLength(1);
        expect(policies[0].moduleKey).toBe('storages');
        expect(policies[0].enabled).toBe(false);
      });
    });
  });

  describe('Given no module policies exist for a tier', () => {
    describe('When getModulePolicies is called', () => {
      it('Then it returns an empty array', async () => {
        modulePolicyRepo.find.mockResolvedValue([]);

        const policies = await provider.getModulePolicies(TierEnum.ENTERPRISE);

        expect(policies).toHaveLength(0);
      });
    });
  });

  // ── getActionOverrides ──────────────────────────────────────────────────────

  describe('Given action overrides exist for FREE tier', () => {
    describe('When getActionOverrides is called', () => {
      it('Then it returns mapped overrides', async () => {
        actionOverrideRepo.find.mockResolvedValue([
          {
            tier: 'FREE',
            enabled: false,
            config: null,
            action: { key: SystemAction.INVENTORY_EXPORT },
          } as TierActionOverrideEntity,
        ]);

        const overrides = await provider.getActionOverrides(TierEnum.FREE);

        expect(overrides).toHaveLength(1);
        expect(overrides[0].actionKey).toBe(SystemAction.INVENTORY_EXPORT);
        expect(overrides[0].enabled).toBe(false);
      });
    });
  });

  // ── getActionModuleMap ──────────────────────────────────────────────────────

  describe('Given catalog actions exist with module relations', () => {
    describe('When getActionModuleMap is called', () => {
      it('Then it returns a map of action key to module key', async () => {
        catalogActionRepo.find.mockResolvedValue([
          {
            key: SystemAction.PRODUCT_CREATE,
            module: { key: 'inventory' },
          } as CatalogActionEntity,
          {
            key: SystemAction.STORAGE_CREATE,
            module: { key: 'storages' },
          } as CatalogActionEntity,
        ]);

        const map = await provider.getActionModuleMap();

        expect(map[SystemAction.PRODUCT_CREATE]).toBe('inventory');
        expect(map[SystemAction.STORAGE_CREATE]).toBe('storages');
      });
    });
  });
});

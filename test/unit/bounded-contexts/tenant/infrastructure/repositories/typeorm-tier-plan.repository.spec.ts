import { Repository } from 'typeorm';
import { TypeOrmTierPlanRepository } from '@tenant/infrastructure/repositories/typeorm-tier-plan.repository';
import { TierPlanEntity } from '@tenant/infrastructure/entities/tier-plan.entity';
import { TierEnum } from '@authorization/domain/enums/tier.enum';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildTierPlanEntity(overrides: Partial<TierPlanEntity> = {}): TierPlanEntity {
  return {
    tier: TierEnum.STARTER,
    name: 'Starter',
    maxProducts: 1000,
    maxUsers: 5,
    maxWarehouses: 3,
    tierOrder: 1,
    maxCustomRooms: 10,
    maxStoreRooms: 5,
    invitationsEnabled: true,
    advancedReportsEnabled: false,
    policyVersion: new Date('2024-01-01'),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  } as TierPlanEntity;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('TypeOrmTierPlanRepository', () => {
  let repository: TypeOrmTierPlanRepository;
  let ormRepo: jest.Mocked<Repository<TierPlanEntity>>;

  beforeEach(() => {
    ormRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
    } as unknown as jest.Mocked<Repository<TierPlanEntity>>;

    repository = new TypeOrmTierPlanRepository(ormRepo);
  });

  // ─── findByTier ──────────────────────────────────────────────────────────

  describe('Given findByTier is called', () => {
    describe('When no plan exists for the given tier', () => {
      beforeEach(() => {
        ormRepo.findOne.mockResolvedValue(null);
      });

      it('Then it returns null', async () => {
        const result = await repository.findByTier(TierEnum.FREE);
        expect(result).toBeNull();
      });

      it('Then it queries with the correct tier filter', async () => {
        await repository.findByTier(TierEnum.FREE);
        expect(ormRepo.findOne).toHaveBeenCalledWith({ where: { tier: TierEnum.FREE } });
      });
    });

    describe('When a plan exists for the given tier', () => {
      beforeEach(() => {
        ormRepo.findOne.mockResolvedValue(buildTierPlanEntity({ tier: TierEnum.STARTER }));
      });

      it('Then it returns a mapped TierPlanModel', async () => {
        const result = await repository.findByTier(TierEnum.STARTER);

        expect(result).not.toBeNull();
        expect(result?.tier).toBe(TierEnum.STARTER);
        expect(result?.name.getValue()).toBe('Starter');
        expect(result?.maxProducts).toBe(1000);
      });
    });
  });

  // ─── findAll ─────────────────────────────────────────────────────────────

  describe('Given findAll is called', () => {
    describe('When no plans exist', () => {
      beforeEach(() => {
        ormRepo.find.mockResolvedValue([]);
      });

      it('Then it returns an empty array', async () => {
        const result = await repository.findAll();
        expect(result).toEqual([]);
      });
    });

    describe('When multiple plans exist', () => {
      beforeEach(() => {
        ormRepo.find.mockResolvedValue([
          buildTierPlanEntity({ tier: TierEnum.FREE, name: 'Free', maxProducts: 100 }),
          buildTierPlanEntity({ tier: TierEnum.STARTER, name: 'Starter', maxProducts: 1000 }),
          buildTierPlanEntity({ tier: TierEnum.GROWTH, name: 'Growth', maxProducts: 5000 }),
        ]);
      });

      it('Then it returns all plans mapped to domain models', async () => {
        const result = await repository.findAll();

        expect(result).toHaveLength(3);
        expect(result[0].tier).toBe(TierEnum.FREE);
        expect(result[1].tier).toBe(TierEnum.STARTER);
        expect(result[2].tier).toBe(TierEnum.GROWTH);
      });

      it('Then it maps maxProducts correctly for each plan', async () => {
        const result = await repository.findAll();

        expect(result[0].maxProducts).toBe(100);
        expect(result[1].maxProducts).toBe(1000);
        expect(result[2].maxProducts).toBe(5000);
      });
    });
  });
});

import { Repository } from 'typeorm';
import { TypeOrmTierPlanRepository } from '@tenant/infrastructure/repositories/typeorm-tier-plan.repository';
import { TierPlanEntity } from '@tenant/infrastructure/entities/tier-plan.entity';
import { TierEnum } from '@shared/domain/policy/tier.enum';

const makeTierPlanEntity = (tier: string): TierPlanEntity =>
  ({
    tier,
    name: tier === 'FREE' ? 'Gratis' : 'Básico',
    maxProducts: tier === 'FREE' ? 100 : 1000,
    maxUsers: tier === 'FREE' ? 1 : 5,
    maxWarehouses: tier === 'FREE' ? 0 : 3,
    maxCustomRooms: tier === 'FREE' ? 1 : 3,
    maxStoreRooms: tier === 'FREE' ? 1 : 3,
    policyVersion: new Date('2026-01-01'),
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  }) as TierPlanEntity;

describe('TypeOrmTierPlanRepository', () => {
  let repo: TypeOrmTierPlanRepository;
  let ormRepo: jest.Mocked<Repository<TierPlanEntity>>;

  beforeEach(() => {
    ormRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
    } as unknown as jest.Mocked<Repository<TierPlanEntity>>;

    repo = new TypeOrmTierPlanRepository(ormRepo);
  });

  describe('Given a FREE tier plan exists in the database', () => {
    describe('When findByTier is called with FREE', () => {
      it('Then it returns the mapped TierPlanModel', async () => {
        ormRepo.findOne.mockResolvedValue(makeTierPlanEntity('FREE'));

        const model = await repo.findByTier(TierEnum.FREE);

        expect(model).not.toBeNull();
        expect(model?.tier).toBe('FREE');
        expect(model?.maxProducts).toBe(100);
        expect(model?.maxWarehouses).toBe(0);
        expect(model?.maxCustomRooms).toBe(1);
        expect(model?.maxStoreRooms).toBe(1);
      });
    });
  });

  describe('Given no tier plan exists for the requested tier', () => {
    describe('When findByTier is called', () => {
      it('Then it returns null', async () => {
        ormRepo.findOne.mockResolvedValue(null);

        const model = await repo.findByTier(TierEnum.GROWTH);

        expect(model).toBeNull();
      });
    });
  });

  describe('Given multiple tier plans exist in the database', () => {
    describe('When findAll is called', () => {
      it('Then it returns all mapped TierPlanModels', async () => {
        ormRepo.find.mockResolvedValue([makeTierPlanEntity('FREE'), makeTierPlanEntity('STARTER')]);

        const models = await repo.findAll();

        expect(models).toHaveLength(2);
        expect(models[0].tier).toBe('FREE');
        expect(models[1].tier).toBe('STARTER');
      });
    });
  });

  describe('Given no tier plans exist in the database', () => {
    describe('When findAll is called', () => {
      it('Then it returns an empty array', async () => {
        ormRepo.find.mockResolvedValue([]);

        const models = await repo.findAll();

        expect(models).toHaveLength(0);
      });
    });
  });
});

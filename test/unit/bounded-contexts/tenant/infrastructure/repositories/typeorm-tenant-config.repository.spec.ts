import type { Repository } from 'typeorm';
import type { IUnitOfWork } from '@shared/domain/contracts/unit-of-work.contract';
import { TenantConfigModel } from '@tenant/domain/models/tenant-config.model';
import { TenantConfigEntity } from '@tenant/infrastructure/entities/tenant-config.entity';
import { TenantConfigMapper } from '@tenant/infrastructure/mappers/tenant-config.mapper';
import { TypeOrmTenantConfigRepository } from '@tenant/infrastructure/repositories/typeorm-tenant-config.repository';

const TENANT_ID = 17;
const ENTITY_UUID = '019538a0-0000-7000-8000-000000000001';

function buildEntity(): TenantConfigEntity {
  const entity = new TenantConfigEntity();
  Object.assign(entity, {
    id: 1,
    uuid: ENTITY_UUID,
    tenantId: TENANT_ID,
    tier: 'FREE',
    maxWarehouses: 0,
    maxCustomRooms: 0,
    maxStoreRooms: 0,
    maxUsers: 1,
    maxProducts: 100,
    notificationsEnabled: true,
    productCount: 0,
    storageCount: 0,
    memberCount: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    archivedAt: null,
  });
  return entity;
}

function makeRepoStub(): jest.Mocked<Repository<TenantConfigEntity>> {
  return {
    findOne: jest.fn(),
    save: jest.fn(),
  } as unknown as jest.Mocked<Repository<TenantConfigEntity>>;
}

const uowStub: IUnitOfWork = {
  isActive: jest.fn().mockReturnValue(false),
  getManager: jest.fn(),
  execute: jest.fn(),
  begin: jest.fn(),
  commit: jest.fn(),
  rollback: jest.fn(),
  runIsolated: jest.fn(),
} as unknown as IUnitOfWork;

describe('TypeOrmTenantConfigRepository', () => {
  describe('findByTenantId', () => {
    describe('Given a persisted config', () => {
      it('Then it returns the mapped TenantConfigModel', async () => {
        const repo = makeRepoStub();
        repo.findOne.mockResolvedValue(buildEntity());
        const sut = new TypeOrmTenantConfigRepository(repo, uowStub);

        const result = await sut.findByTenantId(TENANT_ID);

        expect(result).toBeInstanceOf(TenantConfigModel);
      });
    });

    describe('Given no row for the tenant', () => {
      it('Then it returns null', async () => {
        const repo = makeRepoStub();
        repo.findOne.mockResolvedValue(null);
        const sut = new TypeOrmTenantConfigRepository(repo, uowStub);

        const result = await sut.findByTenantId(TENANT_ID);

        expect(result).toBeNull();
      });
    });
  });

  describe('persist', () => {
    describe('Given a config to persist', () => {
      it('Then it serializes via mapper and saves it through the injected repository', async () => {
        const repo = makeRepoStub();
        const entity = buildEntity();
        repo.save.mockResolvedValue(entity as unknown as TenantConfigEntity);
        const sut = new TypeOrmTenantConfigRepository(repo, uowStub);

        const model = TenantConfigMapper.toDomain(entity);
        const result = await sut.persist(model);

        expect(repo.save).toHaveBeenCalled();
        expect(result).toBeInstanceOf(TenantConfigModel);
      });
    });
  });
});

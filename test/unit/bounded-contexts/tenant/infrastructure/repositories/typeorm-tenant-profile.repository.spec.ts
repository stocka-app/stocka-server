import type { Repository } from 'typeorm';
import type { IUnitOfWork } from '@shared/domain/contracts/unit-of-work.contract';
import { TenantProfileModel } from '@tenant/domain/models/tenant-profile.model';
import { TenantProfileEntity } from '@tenant/infrastructure/entities/tenant-profile.entity';
import { TenantProfileMapper } from '@tenant/infrastructure/mappers/tenant-profile.mapper';
import { TypeOrmTenantProfileRepository } from '@tenant/infrastructure/repositories/typeorm-tenant-profile.repository';

const TENANT_ID = 17;

function buildEntity(overrides: Partial<TenantProfileEntity> = {}): TenantProfileEntity {
  const entity = new TenantProfileEntity();
  Object.assign(entity, {
    id: 1,
    uuid: '019538a0-0000-7000-8000-000000000001',
    tenantId: TENANT_ID,
    giro: null,
    phone: null,
    contactEmail: null,
    website: null,
    addressLine1: null,
    city: null,
    state: null,
    postalCode: null,
    logoUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    archivedAt: null,
    ...overrides,
  });
  return entity;
}

function makeRepoStub(): jest.Mocked<Repository<TenantProfileEntity>> {
  return {
    findOne: jest.fn(),
    save: jest.fn(),
  } as unknown as jest.Mocked<Repository<TenantProfileEntity>>;
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

describe('TypeOrmTenantProfileRepository', () => {
  describe('persist', () => {
    describe('Given a profile to persist with all fields null', () => {
      it('Then it serializes nulls back via mapper', async () => {
        const repo = makeRepoStub();
        const entity = buildEntity();
        repo.save.mockResolvedValue(entity as unknown as TenantProfileEntity);
        const sut = new TypeOrmTenantProfileRepository(repo, uowStub);

        const model = TenantProfileMapper.toDomain(entity);
        const result = await sut.persist(model);

        expect(repo.save).toHaveBeenCalled();
        expect(result).toBeInstanceOf(TenantProfileModel);
      });
    });

    describe('Given a profile to persist with all VO-typed fields populated', () => {
      it('Then it serializes each VO via mapper getValue/toString', async () => {
        const repo = makeRepoStub();
        const entity = buildEntity({
          giro: 'Comercio',
          phone: '+52 55 1234 5678',
          contactEmail: 'contact@example.com',
          website: 'https://example.com',
          addressLine1: '500 Industrial Ave',
          city: 'CDMX',
          state: 'CDMX',
          postalCode: '06000',
          logoUrl: 'https://example.com/logo.png',
        });
        repo.save.mockResolvedValue(entity as unknown as TenantProfileEntity);
        const sut = new TypeOrmTenantProfileRepository(repo, uowStub);

        const model = TenantProfileMapper.toDomain(entity);
        await sut.persist(model);

        const saved = repo.save.mock.calls[0]?.[0] as Partial<TenantProfileEntity>;
        expect(saved.giro).toBe('Comercio');
        expect(saved.phone).toBe('+52 55 1234 5678');
        expect(saved.contactEmail).toBe('contact@example.com');
        expect(saved.website).toBe('https://example.com');
        expect(saved.addressLine1).toBe('500 Industrial Ave');
        expect(saved.city).toBe('CDMX');
        expect(saved.state).toBe('CDMX');
        expect(saved.postalCode).toBe('06000');
        expect(saved.logoUrl).toBe('https://example.com/logo.png');
      });
    });
  });
});

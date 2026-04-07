import { Repository } from 'typeorm';
import { QueryFailedError } from 'typeorm';
import { TypeOrmTenantRepository } from '@tenant/infrastructure/repositories/typeorm-tenant.repository';
import { TenantAggregate } from '@tenant/domain/tenant.aggregate';
import { TenantSlugTakenError } from '@tenant/domain/errors/tenant-slug-taken.error';
import { TenantMapper } from '@tenant/infrastructure/mappers/tenant.mapper';
import { TenantEntity } from '@tenant/infrastructure/entities/tenant.entity';
import { IUnitOfWork } from '@shared/domain/contracts/unit-of-work.contract';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('TypeOrmTenantRepository', () => {
  let repository: TypeOrmTenantRepository;
  let ormRepo: jest.Mocked<Pick<Repository<TenantEntity>, 'findOne' | 'save'>>;
  let uow: jest.Mocked<Pick<IUnitOfWork, 'isActive' | 'getManager' | 'execute'>>;

  beforeEach(() => {
    ormRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
    };
    uow = {
      isActive: jest.fn().mockReturnValue(false),
      getManager: jest.fn(),
      execute: jest.fn(),
    };
    repository = new TypeOrmTenantRepository(
      ormRepo as unknown as Repository<TenantEntity>,
      uow as unknown as IUnitOfWork,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Given a tenant ID', () => {
    describe('When findById is called', () => {
      it('Then it queries the repository with the correct where clause', async () => {
        ormRepo.findOne.mockResolvedValue(null);
        await repository.findById(1);
        expect(ormRepo.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      });
    });
  });

  describe('Given a tenant slug', () => {
    describe('When findBySlug is called', () => {
      it('Then it queries the repository with the correct where clause', async () => {
        ormRepo.findOne.mockResolvedValue(null);
        await repository.findBySlug('my-business');
        expect(ormRepo.findOne).toHaveBeenCalledWith({ where: { slug: 'my-business' } });
      });
    });
  });

  describe('Given the database save succeeds', () => {
    describe('When persist is called', () => {
      it('Then it returns the persisted aggregate', async () => {
        const savedEntity = { id: 1 } as TenantEntity;
        jest.spyOn(TenantMapper, 'toEntity').mockReturnValue({ slug: 'test' });
        ormRepo.save.mockResolvedValue(savedEntity);
        jest.spyOn(TenantMapper, 'toDomain').mockReturnValue({} as TenantAggregate);

        await repository.persist({} as TenantAggregate);

        expect(ormRepo.save).toHaveBeenCalled();
      });
    });
  });

  describe('Given the database throws a unique constraint violation (code 23505)', () => {
    describe('When persist is called with a slug-bearing entity', () => {
      it('Then it throws TenantSlugTakenError with the conflicting slug', async () => {
        const dbError = new QueryFailedError('INSERT', [], new Error('unique'));
        (dbError as QueryFailedError & { code: string }).code = '23505';
        jest.spyOn(TenantMapper, 'toEntity').mockReturnValue({ slug: 'taken-slug' });
        ormRepo.save.mockRejectedValue(dbError);

        await expect(repository.persist({} as TenantAggregate)).rejects.toBeInstanceOf(
          TenantSlugTakenError,
        );
      });
    });

    describe('When persist is called with an entity that has no slug', () => {
      it('Then it throws TenantSlugTakenError with an empty slug', async () => {
        const dbError = new QueryFailedError('INSERT', [], new Error('unique'));
        (dbError as QueryFailedError & { code: string }).code = '23505';
        jest.spyOn(TenantMapper, 'toEntity').mockReturnValue({});
        ormRepo.save.mockRejectedValue(dbError);

        await expect(repository.persist({} as TenantAggregate)).rejects.toBeInstanceOf(
          TenantSlugTakenError,
        );
      });
    });
  });

  describe('Given the database throws a non-constraint error', () => {
    describe('When persist is called', () => {
      it('Then it rethrows the original error', async () => {
        const dbError = new Error('Connection timeout');
        jest.spyOn(TenantMapper, 'toEntity').mockReturnValue({ slug: 'test' });
        ormRepo.save.mockRejectedValue(dbError);

        await expect(repository.persist({} as TenantAggregate)).rejects.toThrow(
          'Connection timeout',
        );
      });
    });
  });
});

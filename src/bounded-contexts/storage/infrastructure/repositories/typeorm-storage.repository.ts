import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import {
  IStorageRepository,
  StoragePage,
} from '@storage/domain/contracts/storage.repository.contract';
import { StorageFilters } from '@storage/application/queries/list-storages/list-storages.query';
import { StorageAggregate } from '@storage/domain/aggregates/storage.aggregate';
import { StorageStatus } from '@storage/domain/enums/storage-status.enum';
import { StorageType } from '@storage/domain/enums/storage-type.enum';
import { StorageEntity } from '@storage/infrastructure/entities/storage.entity';
import { StorageMapper } from '@storage/infrastructure/mappers/storage.mapper';
import { IUnitOfWork } from '@shared/domain/contracts/unit-of-work.contract';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

@Injectable()
export class TypeOrmStorageRepository implements IStorageRepository {
  constructor(
    @InjectRepository(StorageEntity)
    private readonly repository: Repository<StorageEntity>,
    @Inject(INJECTION_TOKENS.UNIT_OF_WORK)
    private readonly uow: IUnitOfWork,
  ) {}

  /* istanbul ignore next */
  private getRepo(): Repository<StorageEntity> {
    if (this.uow.isActive()) {
      return (this.uow.getManager() as EntityManager).getRepository(StorageEntity);
    }
    return this.repository;
  }

  async findByUUID(uuid: string, tenantUUID: string): Promise<StorageAggregate | null> {
    const entity = await this.repository.findOne({
      where: { uuid, tenantUUID },
      relations: ['customRoom', 'storeRoom', 'warehouse'],
    });

    /* istanbul ignore next */
    return entity ? StorageMapper.toDomain(entity) : null;
  }

  async findAll(
    tenantUUID: string,
    filters?: StorageFilters,
    pagination: { page: number; limit: number } = { page: 1, limit: 50 },
    search?: string,
    sortOrder: 'ASC' | 'DESC' = 'ASC',
  ): Promise<StoragePage> {
    const qb = this.repository
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.customRoom', 'customRoom')
      .leftJoinAndSelect('s.storeRoom', 'storeRoom')
      .leftJoinAndSelect('s.warehouse', 'warehouse')
      .where('s.tenant_uuid = :tenantUUID', { tenantUUID })
      .orderBy('s.name', sortOrder);

    if (filters?.type) {
      qb.andWhere('s.type = :type', { type: filters.type });
    }

    if (filters?.status === StorageStatus.ACTIVE) {
      qb.andWhere('s.archived_at IS NULL').andWhere('s.frozen_at IS NULL');
    } else if (filters?.status === StorageStatus.ARCHIVED) {
      qb.andWhere('s.archived_at IS NOT NULL');
    } else if (filters?.status === StorageStatus.FROZEN) {
      qb.andWhere('s.frozen_at IS NOT NULL').andWhere('s.archived_at IS NULL');
    }

    if (search) {
      qb.andWhere('s.name ILIKE :search', { search: `%${search}%` });
    }

    const skip = (pagination.page - 1) * pagination.limit;
    qb.skip(skip).take(pagination.limit);

    const [entities, total] = await qb.getManyAndCount();
    return { items: entities.map((e) => StorageMapper.toDomain(e)), total };
  }

  async countActiveByType(tenantUUID: string, type: StorageType): Promise<number> {
    return this.repository
      .createQueryBuilder('s')
      .where('s.tenant_uuid = :tenantUUID', { tenantUUID })
      .andWhere('s.type = :type', { type })
      .andWhere('s.archived_at IS NULL')
      .getCount();
  }

  async existsActiveName(tenantUUID: string, name: string): Promise<boolean> {
    const count = await this.repository
      .createQueryBuilder('s')
      .where('s.tenant_uuid = :tenantUUID', { tenantUUID })
      .andWhere('LOWER(s.name) = LOWER(:name)', { name })
      .andWhere('s.archived_at IS NULL')
      .getCount();

    return count > 0;
  }

  async save(storage: StorageAggregate): Promise<StorageAggregate> {
    const entityData = StorageMapper.toEntity(storage);
    const repo = this.getRepo();
    const savedEntity = await repo.save(entityData);
    return StorageMapper.toDomain(savedEntity as StorageEntity);
  }

  async archive(storage: StorageAggregate): Promise<void> {
    const repo = this.getRepo();
    await repo.update({ uuid: storage.uuid }, { archivedAt: storage.archivedAt });
  }
}

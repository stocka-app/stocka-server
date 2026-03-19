import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { IStorageRepository } from '@storage/domain/contracts/storage.repository.interface';
import { StorageAggregate } from '@storage/domain/aggregates/storage.aggregate';
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

  async findAllActive(tenantUUID: string): Promise<StorageAggregate[]> {
    const entities = await this.repository.find({
      where: { tenantUUID, archivedAt: undefined },
      relations: ['customRoom', 'storeRoom', 'warehouse'],
      order: { createdAt: 'ASC' },
    });

    const activeEntities = entities.filter((e) => e.archivedAt === null);

    return activeEntities.map((e) => StorageMapper.toDomain(e));
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

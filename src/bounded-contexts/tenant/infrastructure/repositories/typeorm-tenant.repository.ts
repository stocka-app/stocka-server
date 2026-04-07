import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository, EntityManager } from 'typeorm';
import { ITenantContract } from '@tenant/domain/contracts/tenant.contract';
import { TenantAggregate } from '@tenant/domain/tenant.aggregate';
import { Persisted } from '@shared/domain/contracts/base-repository.contract';
import { TenantEntity } from '@tenant/infrastructure/entities/tenant.entity';
import { TenantMapper } from '@tenant/infrastructure/mappers/tenant.mapper';
import { TenantSlugTakenError } from '@tenant/domain/errors/tenant-slug-taken.error';
import { IUnitOfWork } from '@shared/domain/contracts/unit-of-work.contract';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

@Injectable()
export class TypeOrmTenantRepository implements ITenantContract {
  constructor(
    @InjectRepository(TenantEntity)
    private readonly repository: Repository<TenantEntity>,
    @Inject(INJECTION_TOKENS.UNIT_OF_WORK)
    private readonly uow: IUnitOfWork,
  ) {}

  /* istanbul ignore next */
  private get manager(): EntityManager | Repository<TenantEntity> {
    return this.uow.isActive() ? (this.uow.getManager() as EntityManager) : this.repository;
  }

  async findById(id: number): Promise<Persisted<TenantAggregate> | null> {
    const entity = await this.repository.findOne({ where: { id } });
    /* istanbul ignore next */
    return entity ? (TenantMapper.toDomain(entity) as Persisted<TenantAggregate>) : null;
  }

  /* istanbul ignore next */
  async findByUUID(uuid: string): Promise<Persisted<TenantAggregate> | null> {
    const entity = await this.repository.findOne({ where: { uuid } });
    /* istanbul ignore next */
    return entity ? (TenantMapper.toDomain(entity) as Persisted<TenantAggregate>) : null;
  }

  async findBySlug(slug: string): Promise<Persisted<TenantAggregate> | null> {
    const entity = await this.repository.findOne({ where: { slug } });
    /* istanbul ignore next */
    return entity ? (TenantMapper.toDomain(entity) as Persisted<TenantAggregate>) : null;
  }

  async persist(tenant: TenantAggregate): Promise<Persisted<TenantAggregate>> {
    const entityData = TenantMapper.toEntity(tenant);
    /* istanbul ignore next */
    const repo = this.uow.isActive()
      ? (this.uow.getManager() as EntityManager).getRepository(TenantEntity)
      : this.repository;
    try {
      const savedEntity = await repo.save(entityData);
      return TenantMapper.toDomain(savedEntity as TenantEntity) as Persisted<TenantAggregate>;
    } catch (error) {
      // Race-condition defense: CreateTenantHandler deduplicates the slug via findBySlug
      // before reaching persist(). This catch handles the TOCTOU window where two concurrent
      // requests pass the check simultaneously and one hits the unique constraint.
      if (
        error instanceof QueryFailedError &&
        (error as QueryFailedError & { code: string }).code === '23505'
      ) {
        throw new TenantSlugTakenError(entityData.slug ?? '');
      }
      throw error;
    }
  }
}

import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { ITenantConfigContract } from '@tenant/domain/contracts/tenant-config.contract';
import { TenantConfigModel } from '@tenant/domain/models/tenant-config.model';
import { Persisted } from '@shared/domain/contracts/base-repository.contract';
import { TenantConfigEntity } from '@tenant/infrastructure/entities/tenant-config.entity';
import { TenantConfigMapper } from '@tenant/infrastructure/mappers/tenant-config.mapper';
import { IUnitOfWork } from '@shared/domain/contracts/unit-of-work.contract';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

@Injectable()
export class TypeOrmTenantConfigRepository implements ITenantConfigContract {
  constructor(
    @InjectRepository(TenantConfigEntity)
    private readonly repository: Repository<TenantConfigEntity>,
    @Inject(INJECTION_TOKENS.UNIT_OF_WORK)
    private readonly uow: IUnitOfWork,
  ) {}

  /* istanbul ignore next */
  private get manager(): EntityManager | Repository<TenantConfigEntity> {
    return this.uow.isActive() ? (this.uow.getManager() as EntityManager) : this.repository;
  }

  async findByTenantId(tenantId: number): Promise<Persisted<TenantConfigModel> | null> {
    const entity = await this.repository.findOne({ where: { tenantId } });
    /* istanbul ignore next */
    return entity ? (TenantConfigMapper.toDomain(entity) as Persisted<TenantConfigModel>) : null;
  }

  async persist(config: TenantConfigModel): Promise<Persisted<TenantConfigModel>> {
    const entityData = TenantConfigMapper.toEntity(config);
    /* istanbul ignore next */
    const repo = this.uow.isActive()
      ? (this.uow.getManager() as EntityManager).getRepository(TenantConfigEntity)
      : this.repository;
    const savedEntity = await repo.save(entityData);
    return TenantConfigMapper.toDomain(
      savedEntity as TenantConfigEntity,
    ) as Persisted<TenantConfigModel>;
  }
}

import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { ITenantProfileContract } from '@tenant/domain/contracts/tenant-profile.contract';
import { TenantProfileModel } from '@tenant/domain/models/tenant-profile.model';
import { TenantProfileEntity } from '@tenant/infrastructure/entities/tenant-profile.entity';
import { TenantProfileMapper } from '@tenant/infrastructure/mappers/tenant-profile.mapper';
import { IUnitOfWork } from '@shared/domain/contracts/unit-of-work.contract';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

@Injectable()
export class TypeOrmTenantProfileRepository implements ITenantProfileContract {
  constructor(
    @InjectRepository(TenantProfileEntity)
    private readonly repository: Repository<TenantProfileEntity>,
    @Inject(INJECTION_TOKENS.UNIT_OF_WORK)
    private readonly uow: IUnitOfWork,
  ) {}

  /* istanbul ignore next */
  private get manager(): EntityManager | Repository<TenantProfileEntity> {
    return this.uow.isActive() ? (this.uow.getManager() as EntityManager) : this.repository;
  }

  /* istanbul ignore next */
  async findByTenantId(tenantId: number): Promise<TenantProfileModel | null> {
    const entity = await this.repository.findOne({ where: { tenantId } });
    /* istanbul ignore next */
    return entity ? TenantProfileMapper.toDomain(entity) : null;
  }

  async persist(profile: TenantProfileModel): Promise<TenantProfileModel> {
    const entityData = TenantProfileMapper.toEntity(profile);
    /* istanbul ignore next */
    const repo = this.uow.isActive()
      ? (this.uow.getManager() as EntityManager).getRepository(TenantProfileEntity)
      : this.repository;
    const savedEntity = await repo.save(entityData);
    return TenantProfileMapper.toDomain(savedEntity as TenantProfileEntity);
  }
}

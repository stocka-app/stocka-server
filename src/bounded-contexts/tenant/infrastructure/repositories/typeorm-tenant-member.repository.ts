import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { ITenantMemberContract } from '@tenant/domain/contracts/tenant-member.contract';
import { TenantMemberModel } from '@tenant/domain/models/tenant-member.model';
import { TenantMemberEntity } from '@tenant/infrastructure/entities/tenant-member.entity';
import { TenantMemberMapper } from '@tenant/infrastructure/mappers/tenant-member.mapper';
import { IUnitOfWork } from '@shared/domain/contracts/unit-of-work.contract';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

@Injectable()
export class TypeOrmTenantMemberRepository implements ITenantMemberContract {
  constructor(
    @InjectRepository(TenantMemberEntity)
    private readonly repository: Repository<TenantMemberEntity>,
    @Inject(INJECTION_TOKENS.UNIT_OF_WORK)
    private readonly uow: IUnitOfWork,
  ) {}

  /* istanbul ignore next */
  private get manager(): EntityManager | Repository<TenantMemberEntity> {
    return this.uow.isActive() ? (this.uow.getManager() as EntityManager) : this.repository;
  }

  async findByTenantAndUserId(tenantId: number, userId: number): Promise<TenantMemberModel | null> {
    const entity = await this.repository.findOne({ where: { tenantId, userId } });
    /* istanbul ignore next */
    return entity ? TenantMemberMapper.toDomain(entity) : null;
  }

  async findActiveByUserUUID(userUUID: string): Promise<TenantMemberModel | null> {
    const entity = await this.repository.findOne({
      where: { userUUID, status: 'active' },
    });
    /* istanbul ignore next */
    return entity ? TenantMemberMapper.toDomain(entity) : null;
  }

  async findAllByTenantId(tenantId: number): Promise<TenantMemberModel[]> {
    const entities = await this.repository.find({ where: { tenantId } });
    return entities.map((entity) => TenantMemberMapper.toDomain(entity));
  }

  async persist(member: TenantMemberModel): Promise<TenantMemberModel> {
    const entityData = TenantMemberMapper.toEntity(member);
    const repo = this.uow.isActive()
      ? (this.uow.getManager() as EntityManager).getRepository(TenantMemberEntity)
      : this.repository;
    const savedEntity = await repo.save(entityData);
    return TenantMemberMapper.toDomain(savedEntity as TenantMemberEntity);
  }
}

import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { IWarehouseRepository } from '@storage/domain/contracts/warehouse.repository.contract';
import { WarehouseAggregate } from '@storage/domain/aggregates/warehouse.aggregate';
import { WarehouseEntity } from '@storage/infrastructure/entities/warehouse.entity';
import { WarehouseMapper } from '@storage/infrastructure/mappers/warehouse.mapper';
import { IUnitOfWork } from '@shared/domain/contracts/unit-of-work.contract';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

@Injectable()
export class TypeOrmWarehouseRepository implements IWarehouseRepository {
  constructor(
    @InjectRepository(WarehouseEntity)
    private readonly repo: Repository<WarehouseEntity>,
    @Inject(INJECTION_TOKENS.UNIT_OF_WORK)
    private readonly uow: IUnitOfWork,
  ) {}

  private getRepo(): Repository<WarehouseEntity> {
    if (this.uow.isActive()) {
      return (this.uow.getManager() as EntityManager).getRepository(WarehouseEntity);
    }

    return this.repo;
  }

  async count(tenantUUID: string): Promise<number> {
    return this.repo.count({ where: { tenantUUID }, withDeleted: true });
  }

  async findByUUID(uuid: string): Promise<WarehouseAggregate | null> {
    const entity = await this.getRepo().findOne({ where: { uuid }, withDeleted: true });
    return entity ? WarehouseMapper.toDomain(entity) : null;
  }

  async save(aggregate: WarehouseAggregate, storageId: number): Promise<WarehouseAggregate> {
    const entity = WarehouseMapper.toEntity(aggregate, storageId);
    const saved = await this.getRepo().save(entity);
    return WarehouseMapper.toDomain(saved as WarehouseEntity);
  }

  async deleteByUUID(uuid: string): Promise<void> {
    await this.getRepo().delete({ uuid });
  }
}

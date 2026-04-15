import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { IWarehouseRepository } from '@storage/domain/contracts/warehouse.repository.contract';
import { WarehouseModel } from '@storage/domain/models/warehouse.model';
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
    return this.repo.countBy({ tenantUUID });
  }

  async findByUUID(uuid: string): Promise<WarehouseModel | null> {
    const entity = await this.getRepo().findOne({ where: { uuid }, withDeleted: true });
    return entity ? WarehouseMapper.toDomain(entity) : null;
  }

  async save(model: WarehouseModel, storageId: number): Promise<WarehouseModel> {
    const entity = WarehouseMapper.toEntity(model, storageId);
    const saved = await this.getRepo().save(entity);
    return WarehouseMapper.toDomain(saved as WarehouseEntity);
  }

  async deleteByUUID(uuid: string): Promise<void> {
    await this.getRepo().delete({ uuid });
  }
}

import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { IStoreRoomRepository } from '@storage/domain/contracts/store-room.repository.contract';
import { StoreRoomAggregate } from '@storage/domain/aggregates/store-room.aggregate';
import { StoreRoomEntity } from '@storage/infrastructure/entities/store-room.entity';
import { StoreRoomMapper } from '@storage/infrastructure/mappers/store-room.mapper';
import { IUnitOfWork } from '@shared/domain/contracts/unit-of-work.contract';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

@Injectable()
export class TypeOrmStoreRoomRepository implements IStoreRoomRepository {
  constructor(
    @InjectRepository(StoreRoomEntity)
    private readonly repo: Repository<StoreRoomEntity>,
    @Inject(INJECTION_TOKENS.UNIT_OF_WORK)
    private readonly uow: IUnitOfWork,
  ) {}

  private getRepo(): Repository<StoreRoomEntity> {
    if (this.uow.isActive()) {
      return (this.uow.getManager() as EntityManager).getRepository(StoreRoomEntity);
    }

    return this.repo;
  }

  async count(tenantUUID: string): Promise<number> {
    return this.repo.count({ where: { tenantUUID }, withDeleted: true });
  }

  async findByUUID(uuid: string): Promise<StoreRoomAggregate | null> {
    const entity = await this.getRepo().findOne({ where: { uuid }, withDeleted: true });
    return entity ? StoreRoomMapper.toDomain(entity) : null;
  }

  async save(aggregate: StoreRoomAggregate, storageId: number): Promise<StoreRoomAggregate> {
    const entity = StoreRoomMapper.toEntity(aggregate, storageId);
    const saved = await this.getRepo().save(entity);
    return StoreRoomMapper.toDomain(saved as StoreRoomEntity);
  }

  async deleteByUUID(uuid: string): Promise<void> {
    await this.getRepo().delete({ uuid });
  }
}

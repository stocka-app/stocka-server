import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { IStoreRoomRepository } from '@storage/domain/contracts/store-room.repository.contract';
import { StoreRoomModel } from '@storage/domain/models/store-room.model';
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
    /* istanbul ignore next — storage handlers do not use UoW; UoW path is only active in transactional operations */
    if (this.uow.isActive()) {
      return (this.uow.getManager() as EntityManager).getRepository(StoreRoomEntity);
    }
    return this.repo;
  }

  async count(tenantUUID: string): Promise<number> {
    return this.repo.countBy({ tenantUUID });
  }

  async save(model: StoreRoomModel, storageId: number): Promise<StoreRoomModel> {
    const entity = StoreRoomMapper.toEntity(model, storageId);
    const saved = await this.getRepo().save(entity);
    return StoreRoomMapper.toDomain(saved as StoreRoomEntity);
  }

  async deleteByUUID(uuid: string): Promise<void> {
    await this.getRepo().delete({ uuid });
  }
}

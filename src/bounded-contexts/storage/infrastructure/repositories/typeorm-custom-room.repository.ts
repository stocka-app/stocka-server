import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { ICustomRoomRepository } from '@storage/domain/contracts/custom-room.repository.contract';
import { CustomRoomAggregate } from '@storage/domain/aggregates/custom-room.aggregate';
import { CustomRoomEntity } from '@storage/infrastructure/entities/custom-room.entity';
import { CustomRoomMapper } from '@storage/infrastructure/mappers/custom-room.mapper';
import { IUnitOfWork } from '@shared/domain/contracts/unit-of-work.contract';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

@Injectable()
export class TypeOrmCustomRoomRepository implements ICustomRoomRepository {
  constructor(
    @InjectRepository(CustomRoomEntity)
    private readonly repo: Repository<CustomRoomEntity>,
    @Inject(INJECTION_TOKENS.UNIT_OF_WORK)
    private readonly uow: IUnitOfWork,
  ) {}

  private getRepo(): Repository<CustomRoomEntity> {
    if (this.uow.isActive()) {
      return (this.uow.getManager() as EntityManager).getRepository(CustomRoomEntity);
    }

    return this.repo;
  }

  async count(tenantUUID: string): Promise<number> {
    return this.repo.count({ where: { tenantUUID }, withDeleted: true });
  }

  async findByUUID(uuid: string): Promise<CustomRoomAggregate | null> {
    const entity = await this.getRepo().findOne({ where: { uuid }, withDeleted: true });
    return entity ? CustomRoomMapper.toDomain(entity) : null;
  }

  async save(aggregate: CustomRoomAggregate, storageId: number): Promise<CustomRoomAggregate> {
    const entity = CustomRoomMapper.toEntity(aggregate, storageId);
    const saved = await this.getRepo().save(entity);
    return CustomRoomMapper.toDomain(saved as CustomRoomEntity);
  }

  async deleteByUUID(uuid: string): Promise<void> {
    await this.getRepo().delete({ uuid });
  }
}

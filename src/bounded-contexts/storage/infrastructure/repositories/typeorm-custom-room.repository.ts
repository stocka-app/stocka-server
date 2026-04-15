import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { ICustomRoomRepository } from '@storage/domain/contracts/custom-room.repository.contract';
import { CustomRoomModel } from '@storage/domain/models/custom-room.model';
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
    return this.repo.countBy({ tenantUUID });
  }

  async findByUUID(uuid: string): Promise<CustomRoomModel | null> {
    const entity = await this.getRepo().findOne({ where: { uuid } });
    return entity ? CustomRoomMapper.toDomain(entity) : null;
  }

  async save(model: CustomRoomModel, storageId: number): Promise<CustomRoomModel> {
    const entity = CustomRoomMapper.toEntity(model, storageId);
    const saved = await this.getRepo().save(entity);
    return CustomRoomMapper.toDomain(saved as CustomRoomEntity);
  }

  async deleteByUUID(uuid: string): Promise<void> {
    await this.getRepo().delete({ uuid });
  }
}

import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager, IsNull } from 'typeorm';
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
    /* istanbul ignore next — storage handlers do not use UoW; UoW path is only active in transactional operations */
    if (this.uow.isActive()) {
      return (this.uow.getManager() as EntityManager).getRepository(CustomRoomEntity);
    }
    return this.repo;
  }

  async countActive(tenantUUID: string): Promise<number> {
    return this.repo.countBy({ tenantUUID, archivedAt: IsNull() });
  }

  async save(model: CustomRoomModel, storageId: number): Promise<CustomRoomModel> {
    const entity = CustomRoomMapper.toEntity(model, storageId);
    const saved = await this.getRepo().save(entity);
    return CustomRoomMapper.toDomain(saved as CustomRoomEntity);
  }
}

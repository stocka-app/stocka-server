import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, EntityManager } from 'typeorm';
import { ISessionContract } from '@authentication/domain/contracts/session.contract';
import { SessionModel } from '@authentication/domain/models/session.model';
import { SessionEntity } from '@authentication/infrastructure/persistence/entities/session.entity';
import { SessionMapper } from '@authentication/infrastructure/persistence/mappers/session.mapper';
import { IUnitOfWork } from '@shared/domain/contracts/unit-of-work.contract';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

@Injectable()
export class TypeOrmSessionRepository implements ISessionContract {
  constructor(
    @InjectRepository(SessionEntity)
    private readonly repository: Repository<SessionEntity>,
    @Inject(INJECTION_TOKENS.UNIT_OF_WORK)
    private readonly uow: IUnitOfWork,
  ) {}

  async findById(id: number): Promise<SessionModel | null> {
    const entity = await this.repository.findOne({
      where: { id, archivedAt: IsNull() },
    });
    return entity ? SessionMapper.toDomain(entity) : null;
  }

  async findByUUID(uuid: string): Promise<SessionModel | null> {
    const entity = await this.repository.findOne({
      where: { uuid, archivedAt: IsNull() },
    });
    return entity ? SessionMapper.toDomain(entity) : null;
  }

  async findByTokenHash(tokenHash: string): Promise<SessionModel | null> {
    const entity = await this.repository.findOne({
      where: { tokenHash, archivedAt: IsNull() },
    });
    return entity ? SessionMapper.toDomain(entity) : null;
  }

  async findActiveByUserId(userId: number): Promise<SessionModel[]> {
    const entities = await this.repository
      .createQueryBuilder('session')
      .where('session.userId = :userId', { userId })
      .andWhere('session.archivedAt IS NULL')
      .andWhere('session.expiresAt > :now', { now: new Date() })
      .getMany();

    return entities.map((entity) => SessionMapper.toDomain(entity));
  }

  async persist(session: SessionModel): Promise<SessionModel> {
    const entityData = SessionMapper.toEntity(session);
    const repo = this.uow.isActive()
      ? (this.uow.getManager() as EntityManager).getRepository(SessionEntity)
      : this.repository;
    const savedEntity = await repo.save(entityData);
    return SessionMapper.toDomain(savedEntity as SessionEntity);
  }

  async archive(uuid: string): Promise<void> {
    const archivedAt = new Date();
    if (this.uow.isActive()) {
      await (this.uow.getManager() as EntityManager).update(
        SessionEntity,
        { uuid },
        { archivedAt },
      );
    } else {
      await this.repository.update({ uuid }, { archivedAt });
    }
  }

  async archiveAllByUserId(userId: number): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .update(SessionEntity)
      .set({ archivedAt: new Date() })
      .where('userId = :userId', { userId })
      .andWhere('archivedAt IS NULL')
      .execute();
  }

  async destroy(uuid: string): Promise<void> {
    await this.repository.delete({ uuid });
  }
}

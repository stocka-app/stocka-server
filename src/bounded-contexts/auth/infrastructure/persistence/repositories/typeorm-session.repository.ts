import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { ISessionContract } from '@auth/domain/contracts/session.contract';
import { SessionModel } from '@auth/domain/models/session.model';
import { SessionEntity } from '@auth/infrastructure/persistence/entities/session.entity';
import { SessionMapper } from '@auth/infrastructure/persistence/mappers/session.mapper';

@Injectable()
export class TypeOrmSessionRepository implements ISessionContract {
  constructor(
    @InjectRepository(SessionEntity)
    private readonly repository: Repository<SessionEntity>,
  ) {}

  async findById(id: number): Promise<SessionModel | null> {
    const entity = await this.repository.findOne({
      where: { id, archivedAt: IsNull() },
    });
    return entity ? SessionMapper.toDomain(entity) : null;
  }

  async findByUuid(uuid: string): Promise<SessionModel | null> {
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
    const savedEntity = await this.repository.save(entityData);
    return SessionMapper.toDomain(savedEntity as SessionEntity);
  }

  async archive(uuid: string): Promise<void> {
    await this.repository.update({ uuid }, { archivedAt: new Date() });
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

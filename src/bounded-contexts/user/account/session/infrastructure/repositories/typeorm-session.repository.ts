import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, EntityManager } from 'typeorm';
import { ISessionAggregateContract } from '@user/account/session/domain/session.contract';
import { SessionAggregate } from '@user/account/session/domain/session.aggregate';
import { SessionEntity } from '@user/account/session/infrastructure/entities/session.entity';
import { SessionAggregateMapper } from '@user/account/session/infrastructure/mappers/session.mapper';
import { IUnitOfWork } from '@shared/domain/contracts/unit-of-work.contract';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

@Injectable()
export class TypeOrmSessionAggregateRepository implements ISessionAggregateContract {
  constructor(
    @InjectRepository(SessionEntity)
    private readonly repository: Repository<SessionEntity>,
    @Inject(INJECTION_TOKENS.UNIT_OF_WORK)
    private readonly uow: IUnitOfWork,
  ) {}

  async findById(id: number): Promise<SessionAggregate | null> {
    const entity = await this.repository.findOne({ where: { id, archivedAt: IsNull() } });
    return entity ? SessionAggregateMapper.toDomain(entity) : null;
  }

  async findByUUID(uuid: string): Promise<SessionAggregate | null> {
    const entity = await this.repository.findOne({ where: { uuid, archivedAt: IsNull() } });
    return entity ? SessionAggregateMapper.toDomain(entity) : null;
  }

  async findByTokenHash(tokenHash: string): Promise<SessionAggregate | null> {
    const entity = await this.repository.findOne({ where: { tokenHash, archivedAt: IsNull() } });
    return entity ? SessionAggregateMapper.toDomain(entity) : null;
  }

  async findActiveByAccountId(accountId: number): Promise<SessionAggregate[]> {
    const entities = await this.repository
      .createQueryBuilder('session')
      .where('session.accountId = :accountId', { accountId })
      .andWhere('session.archivedAt IS NULL')
      .andWhere('session.expiresAt > :now', { now: new Date() })
      .getMany();
    return entities.map((e) => SessionAggregateMapper.toDomain(e));
  }

  async persist(session: SessionAggregate): Promise<SessionAggregate> {
    const entityData = SessionAggregateMapper.toEntity(session);
    const repo = this.uow.isActive()
      ? (this.uow.getManager() as EntityManager).getRepository(SessionEntity)
      : this.repository;
    const savedEntity = await repo.save(entityData);
    return SessionAggregateMapper.toDomain(savedEntity as SessionEntity);
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

  async archiveAllByAccountId(accountId: number): Promise<void> {
    const archivedAt = new Date();
    if (this.uow.isActive()) {
      await (this.uow.getManager() as EntityManager)
        .createQueryBuilder()
        .update(SessionEntity)
        .set({ archivedAt })
        .where('accountId = :accountId', { accountId })
        .andWhere('archivedAt IS NULL')
        .execute();
    } else {
      await this.repository
        .createQueryBuilder()
        .update(SessionEntity)
        .set({ archivedAt })
        .where('accountId = :accountId', { accountId })
        .andWhere('archivedAt IS NULL')
        .execute();
    }
  }

  async destroy(uuid: string): Promise<void> {
    await this.repository.delete({ uuid });
  }
}

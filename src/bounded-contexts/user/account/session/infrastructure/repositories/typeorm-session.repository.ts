import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, EntityManager } from 'typeorm';
import { ISessionContract } from '@user/account/session/domain/session.contract';
import { Persisted } from '@shared/domain/contracts/base-repository.contract';
import { SessionAggregate } from '@user/account/session/domain/session.aggregate';
import { CredentialSessionModel } from '@user/account/session/domain/models/credential-session.model';
import { SocialSessionModel } from '@user/account/session/domain/models/social-session.model';
import { SessionEntity } from '@user/account/session/infrastructure/entities/session.entity';
import { CredentialSessionEntity } from '@user/account/session/infrastructure/entities/credential-session.entity';
import { SocialSessionEntity } from '@user/account/session/infrastructure/entities/social-session.entity';
import { SessionMapper } from '@user/account/session/infrastructure/mappers/session.mapper';
import { CredentialSessionMapper } from '@user/account/session/infrastructure/mappers/credential-session.mapper';
import { SocialSessionMapper } from '@user/account/session/infrastructure/mappers/social-session.mapper';
import { IUnitOfWork } from '@shared/domain/contracts/unit-of-work.contract';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

@Injectable()
export class TypeOrmSessionRepository implements ISessionContract {
  constructor(
    @InjectRepository(SessionEntity)
    private readonly repository: Repository<SessionEntity>,
    @InjectRepository(CredentialSessionEntity)
    private readonly credentialSessionRepo: Repository<CredentialSessionEntity>,
    @InjectRepository(SocialSessionEntity)
    private readonly socialSessionRepo: Repository<SocialSessionEntity>,
    @Inject(INJECTION_TOKENS.UNIT_OF_WORK)
    private readonly uow: IUnitOfWork,
  ) {}

  async findById(id: number): Promise<Persisted<SessionAggregate> | null> {
    const entity = await this.repository.findOne({ where: { id, archivedAt: IsNull() } });
    return entity ? SessionMapper.toDomain(entity) as Persisted<SessionAggregate> : null;
  }

  async findByUUID(uuid: string): Promise<Persisted<SessionAggregate> | null> {
    const entity = await this.repository.findOne({ where: { uuid, archivedAt: IsNull() } });
    return entity ? SessionMapper.toDomain(entity) as Persisted<SessionAggregate> : null;
  }

  async findByTokenHash(tokenHash: string): Promise<Persisted<SessionAggregate> | null> {
    const entity = await this.repository.findOne({ where: { tokenHash, archivedAt: IsNull() } });
    return entity ? SessionMapper.toDomain(entity) as Persisted<SessionAggregate> : null;
  }

  async findActiveByAccountId(accountId: number): Promise<Persisted<SessionAggregate>[]> {
    const entities = await this.repository
      .createQueryBuilder('session')
      .where('session.accountId = :accountId', { accountId })
      .andWhere('session.archivedAt IS NULL')
      .andWhere('session.expiresAt > :now', { now: new Date() })
      .getMany();
    return entities.map((e) => SessionMapper.toDomain(e) as Persisted<SessionAggregate>);
  }

  async persist(session: SessionAggregate): Promise<Persisted<SessionAggregate>> {
    const entityData = SessionMapper.toEntity(session);
    const repo = this.uow.isActive()
      ? (this.uow.getManager() as EntityManager).getRepository(SessionEntity)
      : this.repository;
    const savedEntity = await repo.save(entityData);
    return SessionMapper.toDomain(savedEntity as SessionEntity) as Persisted<SessionAggregate>;
  }

  async persistWithCredential(
    session: SessionAggregate,
    credentialSession: CredentialSessionModel,
  ): Promise<Persisted<SessionAggregate>> {
    const entityData = SessionMapper.toEntity(session);
    /* istanbul ignore next */
    const sessionRepo = this.uow.isActive()
      ? (this.uow.getManager() as EntityManager).getRepository(SessionEntity)
      : this.repository;

    /* istanbul ignore next */
    const credRepo = this.uow.isActive()
      ? (this.uow.getManager() as EntityManager).getRepository(CredentialSessionEntity)
      : this.credentialSessionRepo;

    const savedSession = await sessionRepo.save(entityData);
    const credEntityData = CredentialSessionMapper.toEntity(credentialSession, savedSession.id);
    await credRepo.save(credRepo.create(credEntityData));

    return SessionMapper.toDomain(savedSession as SessionEntity) as Persisted<SessionAggregate>;
  }

  async persistWithSocial(
    session: SessionAggregate,
    socialSession: SocialSessionModel,
  ): Promise<Persisted<SessionAggregate>> {
    const entityData = SessionMapper.toEntity(session);
    /* istanbul ignore next */
    const sessionRepo = this.uow.isActive()
      ? (this.uow.getManager() as EntityManager).getRepository(SessionEntity)
      : this.repository;

    /* istanbul ignore next */
    const socialRepo = this.uow.isActive()
      ? (this.uow.getManager() as EntityManager).getRepository(SocialSessionEntity)
      : this.socialSessionRepo;

    const savedSession = await sessionRepo.save(entityData);
    const socialEntityData = SocialSessionMapper.toEntity(socialSession, savedSession.id);
    await socialRepo.save(socialRepo.create(socialEntityData));

    return SessionMapper.toDomain(savedSession as SessionEntity) as Persisted<SessionAggregate>;
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

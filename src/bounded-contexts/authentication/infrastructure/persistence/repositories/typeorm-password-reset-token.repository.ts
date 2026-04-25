import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, EntityManager } from 'typeorm';
import { IPasswordResetTokenContract } from '@authentication/domain/contracts/password-reset-token.contract';
import { PasswordResetTokenAggregate } from '@authentication/domain/aggregates/password-reset-token.aggregate';
import { Persisted } from '@shared/domain/contracts/base-repository.contract';
import { PasswordResetTokenEntity } from '@authentication/infrastructure/persistence/entities/password-reset-token.entity';
import { PasswordResetTokenMapper } from '@authentication/infrastructure/persistence/mappers/password-reset-token.mapper';
import { IUnitOfWork } from '@shared/domain/contracts/unit-of-work.contract';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

@Injectable()
export class TypeOrmPasswordResetTokenRepository implements IPasswordResetTokenContract {
  constructor(
    @InjectRepository(PasswordResetTokenEntity)
    private readonly repository: Repository<PasswordResetTokenEntity>,
    @Inject(INJECTION_TOKENS.UNIT_OF_WORK)
    private readonly uow: IUnitOfWork,
  ) {}

  async findById(id: number): Promise<Persisted<PasswordResetTokenAggregate> | null> {
    const entity = await this.repository.findOne({
      where: { id, archivedAt: IsNull() },
    });
    return entity
      ? (PasswordResetTokenMapper.toDomain(entity) as Persisted<PasswordResetTokenAggregate>)
      : null;
  }

  async findByUUID(uuid: string): Promise<Persisted<PasswordResetTokenAggregate> | null> {
    const entity = await this.repository.findOne({
      where: { uuid, archivedAt: IsNull() },
    });
    return entity
      ? (PasswordResetTokenMapper.toDomain(entity) as Persisted<PasswordResetTokenAggregate>)
      : null;
  }

  async findByTokenHash(tokenHash: string): Promise<Persisted<PasswordResetTokenAggregate> | null> {
    const entity = await this.repository.findOne({
      where: { tokenHash, archivedAt: IsNull() },
    });
    return entity
      ? (PasswordResetTokenMapper.toDomain(entity) as Persisted<PasswordResetTokenAggregate>)
      : null;
  }

  async persist(
    token: PasswordResetTokenAggregate,
  ): Promise<Persisted<PasswordResetTokenAggregate>> {
    const entityData = PasswordResetTokenMapper.toEntity(token);
    const repo = this.uow.isActive()
      ? (this.uow.getManager() as EntityManager).getRepository(PasswordResetTokenEntity)
      : this.repository;
    const savedEntity = await repo.save(entityData);
    return PasswordResetTokenMapper.toDomain(
      savedEntity as PasswordResetTokenEntity,
    ) as Persisted<PasswordResetTokenAggregate>;
  }

  async archive(uuid: string): Promise<void> {
    await this.repository.update({ uuid }, { archivedAt: new Date() });
  }
}

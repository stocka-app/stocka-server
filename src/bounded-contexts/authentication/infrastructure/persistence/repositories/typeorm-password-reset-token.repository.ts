import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, EntityManager } from 'typeorm';
import { IPasswordResetTokenContract } from '@authentication/domain/contracts/password-reset-token.contract';
import { PasswordResetTokenModel } from '@authentication/domain/models/password-reset-token.model';
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

  async findById(id: number): Promise<PasswordResetTokenModel | null> {
    const entity = await this.repository.findOne({
      where: { id, archivedAt: IsNull() },
    });
    return entity ? PasswordResetTokenMapper.toDomain(entity) : null;
  }

  async findByUUID(uuid: string): Promise<PasswordResetTokenModel | null> {
    const entity = await this.repository.findOne({
      where: { uuid, archivedAt: IsNull() },
    });
    return entity ? PasswordResetTokenMapper.toDomain(entity) : null;
  }

  async findByTokenHash(tokenHash: string): Promise<PasswordResetTokenModel | null> {
    const entity = await this.repository.findOne({
      where: { tokenHash, archivedAt: IsNull() },
    });
    return entity ? PasswordResetTokenMapper.toDomain(entity) : null;
  }

  async persist(token: PasswordResetTokenModel): Promise<PasswordResetTokenModel> {
    const entityData = PasswordResetTokenMapper.toEntity(token);
    const repo = this.uow.isActive()
      ? (this.uow.getManager() as EntityManager).getRepository(PasswordResetTokenEntity)
      : this.repository;
    const savedEntity = await repo.save(entityData);
    return PasswordResetTokenMapper.toDomain(savedEntity as PasswordResetTokenEntity);
  }

  async archive(uuid: string): Promise<void> {
    await this.repository.update({ uuid }, { archivedAt: new Date() });
  }
}

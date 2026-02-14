import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { IPasswordResetTokenContract } from '@auth/domain/contracts/password-reset-token.contract';
import { PasswordResetTokenModel } from '@auth/domain/models/password-reset-token.model';
import { PasswordResetTokenEntity } from '@auth/infrastructure/persistence/entities/password-reset-token.entity';
import { PasswordResetTokenMapper } from '@auth/infrastructure/persistence/mappers/password-reset-token.mapper';

@Injectable()
export class TypeOrmPasswordResetTokenRepository implements IPasswordResetTokenContract {
  constructor(
    @InjectRepository(PasswordResetTokenEntity)
    private readonly repository: Repository<PasswordResetTokenEntity>,
  ) {}

  async findById(id: number): Promise<PasswordResetTokenModel | null> {
    const entity = await this.repository.findOne({
      where: { id, archivedAt: IsNull() },
    });
    return entity ? PasswordResetTokenMapper.toDomain(entity) : null;
  }

  async findByUuid(uuid: string): Promise<PasswordResetTokenModel | null> {
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
    const savedEntity = await this.repository.save(entityData);
    return PasswordResetTokenMapper.toDomain(savedEntity as PasswordResetTokenEntity);
  }

  async archive(uuid: string): Promise<void> {
    await this.repository.update({ uuid }, { archivedAt: new Date() });
  }
}

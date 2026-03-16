import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { IUserContract } from '@user/domain/contracts/user.contract';
import { UserAggregate } from '@user/domain/models/user.aggregate';
import { UserEntity } from '@user/infrastructure/persistence/entities/user.entity';
import { UserMapper } from '@user/infrastructure/persistence/mappers/user.mapper';
import { IUnitOfWork } from '@shared/domain/contracts/unit-of-work.contract';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

@Injectable()
export class TypeOrmUserRepository implements IUserContract {
  constructor(
    @InjectRepository(UserEntity)
    private readonly repository: Repository<UserEntity>,
    @Inject(INJECTION_TOKENS.UNIT_OF_WORK)
    private readonly uow: IUnitOfWork,
  ) {}

  async findById(id: number): Promise<UserAggregate | null> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? UserMapper.toDomain(entity) : null;
  }

  async findByUUID(uuid: string): Promise<UserAggregate | null> {
    const entity = await this.repository.findOne({ where: { uuid } });
    return entity ? UserMapper.toDomain(entity) : null;
  }

  async existsByUsername(_username: string): Promise<boolean> {
    // Username existence is now checked via personal_profiles table
    // Delegated to CredentialAccountRepository.findByEmailOrUsername or ProfileContract
    return false;
  }

  async persist(user: UserAggregate): Promise<UserAggregate> {
    const entityData = UserMapper.toEntity(user);
    const repo = this.uow.isActive()
      ? (this.uow.getManager() as EntityManager).getRepository(UserEntity)
      : this.repository;
    const savedEntity = await repo.save(entityData);
    return UserMapper.toDomain(savedEntity as UserEntity);
  }

  async archive(uuid: string): Promise<void> {
    await this.repository.update({ uuid }, { archivedAt: new Date() });
  }

  async destroy(uuid: string): Promise<void> {
    await this.repository.delete({ uuid });
  }
}

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IUserContract } from '@user/domain/contracts/user.contract';
import { UserModel } from '@user/domain/models/user.model';
import { UserEntity } from '@user/infrastructure/persistence/entities/user.entity';
import { UserMapper } from '@user/infrastructure/persistence/mappers/user.mapper';

@Injectable()
export class TypeOrmUserRepository implements IUserContract {
  constructor(
    @InjectRepository(UserEntity)
    private readonly repository: Repository<UserEntity>,
  ) {}

  async findById(id: number): Promise<UserModel | null> {
    const entity = await this.repository.findOne({
      where: { id, archivedAt: undefined },
    });
    return entity ? UserMapper.toDomain(entity) : null;
  }

  async findByUUID(uuid: string): Promise<UserModel | null> {
    const entity = await this.repository.findOne({
      where: { uuid, archivedAt: undefined },
    });
    return entity ? UserMapper.toDomain(entity) : null;
  }

  async findByEmail(email: string): Promise<UserModel | null> {
    const entity = await this.repository
      .createQueryBuilder('user')
      .where('LOWER(user.email) = LOWER(:email)', { email })
      .andWhere('user.archivedAt IS NULL')
      .getOne();
    return entity ? UserMapper.toDomain(entity) : null;
  }

  async findByUsername(username: string): Promise<UserModel | null> {
    const entity = await this.repository
      .createQueryBuilder('user')
      .where('LOWER(user.username) = LOWER(:username)', { username })
      .andWhere('user.archivedAt IS NULL')
      .getOne();
    return entity ? UserMapper.toDomain(entity) : null;
  }

  async findByEmailOrUsername(identifier: string): Promise<UserModel | null> {
    const entity = await this.repository
      .createQueryBuilder('user')
      .where(
        '(LOWER(user.email) = LOWER(:identifier) OR LOWER(user.username) = LOWER(:identifier))',
        {
          identifier,
        },
      )
      .andWhere('user.archivedAt IS NULL')
      .getOne();
    return entity ? UserMapper.toDomain(entity) : null;
  }

  async existsByEmail(email: string): Promise<boolean> {
    const count = await this.repository
      .createQueryBuilder('user')
      .where('LOWER(user.email) = LOWER(:email)', { email })
      .andWhere('user.archivedAt IS NULL')
      .getCount();
    return count > 0;
  }

  async existsByUsername(username: string): Promise<boolean> {
    const count = await this.repository
      .createQueryBuilder('user')
      .where('LOWER(user.username) = LOWER(:username)', { username })
      .andWhere('user.archivedAt IS NULL')
      .getCount();
    return count > 0;
  }

  async persist(user: UserModel): Promise<UserModel> {
    const entityData = UserMapper.toEntity(user);
    const savedEntity = await this.repository.save(entityData);
    return UserMapper.toDomain(savedEntity as UserEntity);
  }

  async archive(uuid: string): Promise<void> {
    await this.repository.update({ uuid }, { archivedAt: new Date() });
  }

  async destroy(uuid: string): Promise<void> {
    await this.repository.delete({ uuid });
  }

  async destroyStaleUnverifiedUsers(olderThanDays: number): Promise<number> {
    const result = await this.repository
      .createQueryBuilder()
      .delete()
      .from(UserEntity)
      .where('status = :status', { status: 'pending_verification' })
      .andWhere('account_type != :flexible', { flexible: 'flexible' })
      .andWhere('archived_at IS NULL')
      .andWhere('created_at < NOW() - INTERVAL :interval', {
        interval: `${olderThanDays} days`,
      })
      .execute();

    return result.affected ?? 0;
  }
}

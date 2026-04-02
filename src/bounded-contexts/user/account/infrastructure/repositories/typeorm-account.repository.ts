import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { IAccountContract } from '@user/account/domain/contracts/account.contract';
import { AccountAggregate } from '@user/account/domain/account.aggregate';
import { Persisted } from '@shared/domain/contracts/base-repository.contract';
import { AccountEntity } from '@user/account/infrastructure/entities/account.entity';
import { AccountMapper } from '@user/account/infrastructure/mappers/account.mapper';
import { IUnitOfWork } from '@shared/domain/contracts/unit-of-work.contract';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

@Injectable()
export class TypeOrmAccountRepository implements IAccountContract {
  constructor(
    @InjectRepository(AccountEntity)
    private readonly repository: Repository<AccountEntity>,
    @Inject(INJECTION_TOKENS.UNIT_OF_WORK)
    private readonly uow: IUnitOfWork,
  ) {}

  /* istanbul ignore next */
  private get manager(): EntityManager | Repository<AccountEntity> {
    return this.uow.isActive() ? (this.uow.getManager() as EntityManager) : this.repository;
  }

  async findById(id: number): Promise<Persisted<AccountAggregate> | null> {
    const entity = await this.repository.findOne({ where: { id } });
    /* istanbul ignore next */
    return entity ? AccountMapper.toDomain(entity) as Persisted<AccountAggregate> : null;
  }

  async findByUserId(userId: number): Promise<Persisted<AccountAggregate> | null> {
    const entity = await this.repository.findOne({ where: { userId } });
    /* istanbul ignore next */
    return entity ? AccountMapper.toDomain(entity) as Persisted<AccountAggregate> : null;
  }

  async persist(account: AccountAggregate): Promise<Persisted<AccountAggregate>> {
    const entityData = AccountMapper.toEntity(account);
    const repo = this.uow.isActive()
      ? (this.uow.getManager() as EntityManager).getRepository(AccountEntity)
      : this.repository;
    const savedEntity = await repo.save(entityData);
    return AccountMapper.toDomain(savedEntity as AccountEntity) as Persisted<AccountAggregate>;
  }
}

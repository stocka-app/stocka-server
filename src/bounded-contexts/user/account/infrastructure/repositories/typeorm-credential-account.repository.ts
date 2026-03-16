import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { ICredentialAccountContract } from '@user/account/domain/contracts/account.contract';
import { CredentialAccountModel } from '@user/account/domain/models/credential-account.model';
import { CredentialAccountEntity } from '@user/account/infrastructure/entities/credential-account.entity';
import { CredentialAccountMapper } from '@user/account/infrastructure/mappers/credential-account.mapper';
import { IUnitOfWork } from '@shared/domain/contracts/unit-of-work.contract';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

@Injectable()
export class TypeOrmCredentialAccountRepository implements ICredentialAccountContract {
  constructor(
    @InjectRepository(CredentialAccountEntity)
    private readonly repository: Repository<CredentialAccountEntity>,
    @Inject(INJECTION_TOKENS.UNIT_OF_WORK)
    private readonly uow: IUnitOfWork,
  ) {}

  async findById(id: number): Promise<CredentialAccountModel | null> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? CredentialAccountMapper.toDomain(entity) : null;
  }

  async findByAccountId(accountId: number): Promise<CredentialAccountModel | null> {
    const entity = await this.repository.findOne({ where: { accountId } });
    return entity ? CredentialAccountMapper.toDomain(entity) : null;
  }

  async findByEmail(email: string): Promise<CredentialAccountModel | null> {
    const entity = await this.repository
      .createQueryBuilder('ca')
      .where('LOWER(ca.email) = LOWER(:email)', { email })
      .andWhere('ca.archivedAt IS NULL')
      .getOne();
    return entity ? CredentialAccountMapper.toDomain(entity) : null;
  }

  async findByEmailOrUsername(identifier: string): Promise<CredentialAccountModel | null> {
    const isEmail = identifier.includes('@');

    if (isEmail) {
      return this.findByEmail(identifier);
    }

    // Search by username via personal_profiles join
    const entity = await this.repository
      .createQueryBuilder('ca')
      .innerJoin('accounts', 'acc', 'acc.id = ca.account_id')
      .innerJoin('profiles', 'prof', 'prof.user_id = acc.user_id')
      .innerJoin('personal_profiles', 'pp', 'pp.profile_id = prof.id')
      .where('LOWER(pp.username) = LOWER(:identifier)', { identifier })
      .andWhere('ca.archivedAt IS NULL')
      .getOne();

    return entity ? CredentialAccountMapper.toDomain(entity) : null;
  }

  async persist(model: CredentialAccountModel): Promise<CredentialAccountModel> {
    const entityData = CredentialAccountMapper.toEntity(model);
    const repo = this.uow.isActive()
      ? (this.uow.getManager() as EntityManager).getRepository(CredentialAccountEntity)
      : this.repository;
    const savedEntity = await repo.save(entityData);
    return CredentialAccountMapper.toDomain(savedEntity as CredentialAccountEntity);
  }

  async archiveByAccountId(accountId: number): Promise<void> {
    await this.repository.update({ accountId }, { archivedAt: new Date() });
  }
}

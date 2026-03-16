import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { ISocialAccountContract } from '@user/account/domain/contracts/account.contract';
import { SocialAccountModel } from '@user/account/domain/models/social-account.model';
import { SocialAccountEntity } from '@user/account/infrastructure/entities/social-account.entity';
import { SocialAccountMapper } from '@user/infrastructure/persistence/mappers/social-account.mapper';
import { IUnitOfWork } from '@shared/domain/contracts/unit-of-work.contract';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

/**
 * @deprecated Use TypeOrmSocialAccountRepository from @user/account/infrastructure instead.
 * This file is kept for backward compatibility during migration.
 */
@Injectable()
export class TypeOrmSocialAccountRepository implements ISocialAccountContract {
  constructor(
    @InjectRepository(SocialAccountEntity)
    private readonly repository: Repository<SocialAccountEntity>,
    @Inject(INJECTION_TOKENS.UNIT_OF_WORK)
    private readonly uow: IUnitOfWork,
  ) {}

  async findByAccountId(accountId: number): Promise<SocialAccountModel[]> {
    const entities = await this.repository.find({ where: { accountId } });
    return entities.map((e) => SocialAccountMapper.toDomain(e));
  }

  async findByProviderAndProviderId(
    provider: string,
    providerId: string,
  ): Promise<SocialAccountModel | null> {
    const entity = await this.repository.findOne({ where: { provider, providerId } });
    return entity ? SocialAccountMapper.toDomain(entity) : null;
  }

  async persist(model: SocialAccountModel): Promise<SocialAccountModel> {
    const repo = this.uow.isActive()
      ? (this.uow.getManager() as EntityManager).getRepository(SocialAccountEntity)
      : this.repository;
    const entityData = repo.create({
      accountId: model.accountId,
      provider: model.provider,
      providerId: model.providerId,
      providerEmail: model.providerEmail,
    });
    const saved = await repo.save(entityData);
    return SocialAccountMapper.toDomain(saved);
  }
}

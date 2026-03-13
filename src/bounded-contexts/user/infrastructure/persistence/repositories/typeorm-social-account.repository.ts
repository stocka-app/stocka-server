import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { ISocialAccountContract } from '@user/domain/contracts/social-account.contract';
import { SocialAccountModel } from '@user/domain/models/social-account.model';
import { SocialAccountEntity } from '@user/infrastructure/persistence/entities/social-account.entity';
import { SocialAccountMapper } from '@user/infrastructure/persistence/mappers/social-account.mapper';
import { IUnitOfWork } from '@shared/domain/contracts/unit-of-work.contract';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

@Injectable()
export class TypeOrmSocialAccountRepository implements ISocialAccountContract {
  constructor(
    @InjectRepository(SocialAccountEntity)
    private readonly repository: Repository<SocialAccountEntity>,
    @Inject(INJECTION_TOKENS.UNIT_OF_WORK)
    private readonly uow: IUnitOfWork,
  ) {}

  async persist(data: {
    userId: number;
    provider: string;
    providerId: string;
  }): Promise<SocialAccountModel> {
    const repo = this.uow.isActive()
      ? (this.uow.getManager() as EntityManager).getRepository(SocialAccountEntity)
      : this.repository;
    const entity = repo.create(data);
    const saved = await repo.save(entity);
    return SocialAccountMapper.toDomain(saved);
  }

  async findByProviderAndProviderId(
    provider: string,
    providerId: string,
  ): Promise<SocialAccountModel | null> {
    const entity = await this.repository.findOne({
      where: { provider, providerId },
    });
    return entity ? SocialAccountMapper.toDomain(entity) : null;
  }
}

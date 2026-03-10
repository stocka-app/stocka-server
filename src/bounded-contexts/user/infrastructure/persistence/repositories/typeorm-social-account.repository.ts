import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ISocialAccountContract } from '@user/domain/contracts/social-account.contract';
import { SocialAccountModel } from '@user/domain/models/social-account.model';
import { SocialAccountEntity } from '@user/infrastructure/persistence/entities/social-account.entity';
import { SocialAccountMapper } from '@user/infrastructure/persistence/mappers/social-account.mapper';

@Injectable()
export class TypeOrmSocialAccountRepository implements ISocialAccountContract {
  constructor(
    @InjectRepository(SocialAccountEntity)
    private readonly repository: Repository<SocialAccountEntity>,
  ) {}

  async persist(data: {
    userId: number;
    provider: string;
    providerId: string;
  }): Promise<SocialAccountModel> {
    const entity = this.repository.create(data);
    const saved = await this.repository.save(entity);
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

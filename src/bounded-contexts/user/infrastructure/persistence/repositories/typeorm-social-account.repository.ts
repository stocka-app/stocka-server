import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ISocialAccountContract } from '@user/domain/contracts/social-account.contract';
import { SocialAccountEntity } from '@user/infrastructure/persistence/entities/social-account.entity';

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
  }): Promise<SocialAccountEntity> {
    const entity = this.repository.create(data);
    return this.repository.save(entity);
  }

  async findByProviderAndProviderId(
    provider: string,
    providerId: string,
  ): Promise<SocialAccountEntity | null> {
    return this.repository.findOne({
      where: { provider, providerId },
    });
  }
}

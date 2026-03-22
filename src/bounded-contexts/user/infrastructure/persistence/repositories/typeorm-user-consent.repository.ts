import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IUserConsentContract } from '@user/domain/contracts/user-consent.contract';
import { UserConsentEntity } from '@user/infrastructure/persistence/entities/user-consent.entity';

@Injectable()
export class TypeOrmUserConsentRepository implements IUserConsentContract {
  constructor(
    @InjectRepository(UserConsentEntity)
    private readonly repository: Repository<UserConsentEntity>,
  ) {}

  async recordConsents(consents: UserConsentEntity[]): Promise<void> {
    await this.repository.save(consents);
  }

  async findLatestByUser(userUUID: string): Promise<UserConsentEntity[]> {
    // For each consent_type, return the most recent row via a lateral subquery.
    // TypeORM doesn't natively support DISTINCT ON, so we use a query builder approach.
    const subQuery = this.repository
      .createQueryBuilder('uc')
      .select('DISTINCT ON (uc.consent_type) uc.*')
      .where('uc.user_uuid = :userUUID')
      .orderBy('uc.consent_type', 'ASC')
      .addOrderBy('uc.created_at', 'DESC');

    return subQuery.setParameter('userUUID', userUUID).getRawMany();
  }
}

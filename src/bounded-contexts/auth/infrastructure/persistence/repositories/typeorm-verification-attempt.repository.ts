import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IVerificationAttemptContract } from '@/auth/domain/contracts/verification-attempt.contract';
import { VerificationAttemptModel } from '@/auth/domain/models/verification-attempt.model';
import { VerificationAttemptEntity } from '@/auth/infrastructure/persistence/entities/verification-attempt.entity';
import { VerificationAttemptMapper } from '@/auth/infrastructure/persistence/mappers/verification-attempt.mapper';

@Injectable()
export class TypeOrmVerificationAttemptRepository implements IVerificationAttemptContract {
  constructor(
    @InjectRepository(VerificationAttemptEntity)
    private readonly repository: Repository<VerificationAttemptEntity>,
  ) {}

  async findById(id: number): Promise<VerificationAttemptModel | null> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? VerificationAttemptMapper.toDomain(entity) : null;
  }

  async findByUuid(uuid: string): Promise<VerificationAttemptModel | null> {
    const entity = await this.repository.findOne({ where: { uuid } });
    return entity ? VerificationAttemptMapper.toDomain(entity) : null;
  }

  async persist(attempt: VerificationAttemptModel): Promise<VerificationAttemptModel> {
    const entityData = VerificationAttemptMapper.toEntity(attempt);
    const savedEntity = await this.repository.save(entityData);
    return VerificationAttemptMapper.toDomain(savedEntity as VerificationAttemptEntity);
  }

  async countFailedByUserUuidInLastHour(userUuid: string): Promise<number> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    return this.repository
      .createQueryBuilder('attempt')
      .where('attempt.userUuid = :userUuid', { userUuid })
      .andWhere('attempt.success = false')
      .andWhere('attempt.attemptedAt > :oneHourAgo', { oneHourAgo })
      .getCount();
  }

  async countFailedByUserUuidInLast24Hours(userUuid: string): Promise<number> {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    return this.repository
      .createQueryBuilder('attempt')
      .where('attempt.userUuid = :userUuid', { userUuid })
      .andWhere('attempt.success = false')
      .andWhere('attempt.attemptedAt > :twentyFourHoursAgo', { twentyFourHoursAgo })
      .getCount();
  }

  async countFailedByIpAddressInLastHour(ipAddress: string): Promise<number> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    return this.repository
      .createQueryBuilder('attempt')
      .where('attempt.ipAddress = :ipAddress', { ipAddress })
      .andWhere('attempt.success = false')
      .andWhere('attempt.attemptedAt > :oneHourAgo', { oneHourAgo })
      .getCount();
  }

  async countFailedByEmailInLastHour(email: string): Promise<number> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    return this.repository
      .createQueryBuilder('attempt')
      .where('attempt.email = :email', { email })
      .andWhere('attempt.success = false')
      .andWhere('attempt.attemptedAt > :oneHourAgo', { oneHourAgo })
      .getCount();
  }

  async findRecentByUserUuid(userUuid: string, limit: number): Promise<VerificationAttemptModel[]> {
    const entities = await this.repository.find({
      where: { userUuid },
      order: { attemptedAt: 'DESC' },
      take: limit,
    });

    return entities.map((entity) => VerificationAttemptMapper.toDomain(entity));
  }

  async archiveOlderThan(date: Date): Promise<number> {
    const result = await this.repository
      .createQueryBuilder()
      .update(VerificationAttemptEntity)
      .set({ archivedAt: new Date() })
      .where('attemptedAt < :date', { date })
      .andWhere('archivedAt IS NULL')
      .execute();

    return result.affected || 0;
  }
}

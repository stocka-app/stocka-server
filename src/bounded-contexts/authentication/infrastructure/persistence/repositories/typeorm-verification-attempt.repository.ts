import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { IVerificationAttemptContract } from '@authentication/domain/contracts/verification-attempt.contract';
import { VerificationAttemptModel } from '@authentication/domain/models/verification-attempt.model';
import { Persisted } from '@shared/domain/contracts/base-repository.contract';
import { VerificationAttemptEntity } from '@authentication/infrastructure/persistence/entities/verification-attempt.entity';
import { VerificationAttemptMapper } from '@authentication/infrastructure/persistence/mappers/verification-attempt.mapper';
import { IUnitOfWork } from '@shared/domain/contracts/unit-of-work.contract';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

@Injectable()
export class TypeOrmVerificationAttemptRepository implements IVerificationAttemptContract {
  constructor(
    @InjectRepository(VerificationAttemptEntity)
    private readonly repository: Repository<VerificationAttemptEntity>,
    @Inject(INJECTION_TOKENS.UNIT_OF_WORK)
    private readonly uow: IUnitOfWork,
  ) {}

  async findById(id: number): Promise<Persisted<VerificationAttemptModel> | null> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? VerificationAttemptMapper.toDomain(entity) as Persisted<VerificationAttemptModel> : null;
  }

  async findByUUID(uuid: string): Promise<Persisted<VerificationAttemptModel> | null> {
    const entity = await this.repository.findOne({ where: { uuid } });
    return entity ? VerificationAttemptMapper.toDomain(entity) as Persisted<VerificationAttemptModel> : null;
  }

  async persist(attempt: VerificationAttemptModel): Promise<Persisted<VerificationAttemptModel>> {
    const entityData = VerificationAttemptMapper.toEntity(attempt);
    const repo = this.uow.isActive()
      ? (this.uow.getManager() as EntityManager).getRepository(VerificationAttemptEntity)
      : this.repository;

    const savedEntity = await repo.save(entityData);
    return VerificationAttemptMapper.toDomain(savedEntity as VerificationAttemptEntity) as Persisted<VerificationAttemptModel>;
  }

  async countFailedByUserUUIDInLastHour(userUUID: string): Promise<number> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    return this.repository
      .createQueryBuilder('attempt')
      .where('attempt.userUUID = :userUUID', { userUUID })
      .andWhere('attempt.success = false')
      .andWhere('attempt.attemptedAt > :oneHourAgo', { oneHourAgo })
      .getCount();
  }

  async countFailedByUserUUIDInLast24Hours(userUUID: string): Promise<number> {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    return this.repository
      .createQueryBuilder('attempt')
      .where('attempt.userUUID = :userUUID', { userUUID })
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

  async findRecentByUserUUID(userUUID: string, limit: number): Promise<Persisted<VerificationAttemptModel>[]> {
    const entities = await this.repository.find({
      where: { userUUID },
      order: { attemptedAt: 'DESC' },
      take: limit,
    });

    return entities.map((entity) => VerificationAttemptMapper.toDomain(entity) as Persisted<VerificationAttemptModel>);
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

  async countFailedByIpAddressInLastHourByType(
    ipAddress: string,
    verificationType: string,
  ): Promise<number> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    return this.repository
      .createQueryBuilder('attempt')
      .where('attempt.ipAddress = :ipAddress', { ipAddress })
      .andWhere('attempt.success = :success', { success: false })
      .andWhere('attempt.verificationType = :verificationType', { verificationType })
      .andWhere('attempt.attemptedAt > :oneHourAgo', { oneHourAgo })
      .getCount();
  }

  async countFailedByIdentifierInLastHourByType(
    identifier: string,
    verificationType: string,
  ): Promise<number> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    return this.repository
      .createQueryBuilder('attempt')
      .where('(attempt.email = :identifier OR attempt.userUUID = :identifier)', { identifier })
      .andWhere('attempt.success = :success', { success: false })
      .andWhere('attempt.verificationType = :verificationType', { verificationType })
      .andWhere('attempt.attemptedAt > :oneHourAgo', { oneHourAgo })
      .getCount();
  }

  async countFailedByUserUUIDInLastHourByType(
    userUUID: string,
    verificationType: string,
  ): Promise<number> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    return this.repository
      .createQueryBuilder('attempt')
      .where('attempt.userUUID = :userUUID', { userUUID })
      .andWhere('attempt.success = :success', { success: false })
      .andWhere('attempt.verificationType = :verificationType', { verificationType })
      .andWhere('attempt.attemptedAt > :oneHourAgo', { oneHourAgo })
      .getCount();
  }
}

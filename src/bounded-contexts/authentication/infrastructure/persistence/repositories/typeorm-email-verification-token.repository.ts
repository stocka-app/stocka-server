import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, MoreThan, EntityManager } from 'typeorm';
import { IEmailVerificationTokenContract } from '@authentication/domain/contracts/email-verification-token.contract';
import { EmailVerificationTokenModel } from '@authentication/domain/models/email-verification-token.model';
import { EmailVerificationTokenEntity } from '@authentication/infrastructure/persistence/entities/email-verification-token.entity';
import { EmailVerificationTokenMapper } from '@authentication/infrastructure/persistence/mappers/email-verification-token.mapper';
import { IUnitOfWork } from '@shared/domain/contracts/unit-of-work.contract';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

@Injectable()
export class TypeOrmEmailVerificationTokenRepository implements IEmailVerificationTokenContract {
  constructor(
    @InjectRepository(EmailVerificationTokenEntity)
    private readonly repository: Repository<EmailVerificationTokenEntity>,
    @Inject(INJECTION_TOKENS.UNIT_OF_WORK)
    private readonly uow: IUnitOfWork,
  ) {}

  async findById(id: number): Promise<EmailVerificationTokenModel | null> {
    const entity = await this.repository.findOne({
      where: { id, archivedAt: IsNull() },
    });
    return entity ? EmailVerificationTokenMapper.toDomain(entity) : null;
  }

  async findByUUID(uuid: string): Promise<EmailVerificationTokenModel | null> {
    const entity = await this.repository.findOne({
      where: { uuid, archivedAt: IsNull() },
    });
    return entity ? EmailVerificationTokenMapper.toDomain(entity) : null;
  }

  async findActiveByUserId(userId: number): Promise<EmailVerificationTokenModel | null> {
    const entity = await this.repository.findOne({
      where: {
        userId,
        archivedAt: IsNull(),
        usedAt: IsNull(),
        expiresAt: MoreThan(new Date()),
      },
      order: { createdAt: 'DESC' },
    });
    return entity ? EmailVerificationTokenMapper.toDomain(entity) : null;
  }

  async findByCodeHash(codeHash: string): Promise<EmailVerificationTokenModel | null> {
    const entity = await this.repository.findOne({
      where: {
        codeHash,
        archivedAt: IsNull(),
        usedAt: IsNull(),
      },
    });
    return entity ? EmailVerificationTokenMapper.toDomain(entity) : null;
  }

  async persist(token: EmailVerificationTokenModel): Promise<EmailVerificationTokenModel> {
    const entityData = EmailVerificationTokenMapper.toEntity(token);
    const repo = this.uow.isActive()
      ? (this.uow.getManager() as EntityManager).getRepository(EmailVerificationTokenEntity)
      : this.repository;
    const savedEntity = await repo.save(entityData);
    return EmailVerificationTokenMapper.toDomain(savedEntity as EmailVerificationTokenEntity);
  }

  async archive(uuid: string): Promise<void> {
    await this.repository.update({ uuid }, { archivedAt: new Date() });
  }

  async archiveAllByUserId(userId: number): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .update(EmailVerificationTokenEntity)
      .set({ archivedAt: new Date() })
      .where('userId = :userId', { userId })
      .andWhere('archivedAt IS NULL')
      .execute();
  }

  async countResentInLastHour(userId: number): Promise<number> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const result = await this.repository
      .createQueryBuilder('token')
      .where('token.userId = :userId', { userId })
      .andWhere('token.lastResentAt > :oneHourAgo', { oneHourAgo })
      .getCount();

    return result;
  }

  async destroy(uuid: string): Promise<void> {
    await this.repository.delete({ uuid });
  }
}

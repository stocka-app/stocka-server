import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, MoreThan, EntityManager } from 'typeorm';
import { IEmailVerificationTokenContract } from '@authentication/domain/contracts/email-verification-token.contract';
import { EmailVerificationTokenModel } from '@authentication/domain/models/email-verification-token.model';
import { Persisted } from '@shared/domain/contracts/base-repository.contract';
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

  async findById(id: number): Promise<Persisted<EmailVerificationTokenModel> | null> {
    const entity = await this.repository.findOne({
      where: { id, archivedAt: IsNull() },
    });
    return entity ? EmailVerificationTokenMapper.toDomain(entity) as Persisted<EmailVerificationTokenModel> : null;
  }

  async findByUUID(uuid: string): Promise<Persisted<EmailVerificationTokenModel> | null> {
    const entity = await this.repository.findOne({
      where: { uuid, archivedAt: IsNull() },
    });
    return entity ? EmailVerificationTokenMapper.toDomain(entity) as Persisted<EmailVerificationTokenModel> : null;
  }

  async findActiveByCredentialAccountId(
    credentialAccountId: number,
  ): Promise<Persisted<EmailVerificationTokenModel> | null> {
    const entity = await this.repository.findOne({
      where: {
        credentialAccountId,
        archivedAt: IsNull(),
        usedAt: IsNull(),
        expiresAt: MoreThan(new Date()),
      },
      order: { createdAt: 'DESC' },
    });
    return entity ? EmailVerificationTokenMapper.toDomain(entity) as Persisted<EmailVerificationTokenModel> : null;
  }

  async findByCodeHash(codeHash: string): Promise<Persisted<EmailVerificationTokenModel> | null> {
    const entity = await this.repository.findOne({
      where: {
        codeHash,
        archivedAt: IsNull(),
        usedAt: IsNull(),
      },
    });
    return entity ? EmailVerificationTokenMapper.toDomain(entity) as Persisted<EmailVerificationTokenModel> : null;
  }

  async persist(token: EmailVerificationTokenModel): Promise<Persisted<EmailVerificationTokenModel>> {
    const entityData = EmailVerificationTokenMapper.toEntity(token);
    const repo = this.uow.isActive()
      ? (this.uow.getManager() as EntityManager).getRepository(EmailVerificationTokenEntity)
      : this.repository;
    const savedEntity = await repo.save(entityData);
    return EmailVerificationTokenMapper.toDomain(savedEntity as EmailVerificationTokenEntity) as Persisted<EmailVerificationTokenModel>;
  }

  async archive(uuid: string): Promise<void> {
    await this.repository.update({ uuid }, { archivedAt: new Date() });
  }

  async archiveAllByCredentialAccountId(credentialAccountId: number): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .update(EmailVerificationTokenEntity)
      .set({ archivedAt: new Date() })
      .where('credentialAccountId = :credentialAccountId', { credentialAccountId })
      .andWhere('archivedAt IS NULL')
      .execute();
  }

  async countResentInLastHour(credentialAccountId: number): Promise<number> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const result = await this.repository
      .createQueryBuilder('token')
      .where('token.credentialAccountId = :credentialAccountId', { credentialAccountId })
      .andWhere('token.lastResentAt > :oneHourAgo', { oneHourAgo })
      .getCount();

    return result;
  }

  async destroy(uuid: string): Promise<void> {
    await this.repository.delete({ uuid });
  }
}

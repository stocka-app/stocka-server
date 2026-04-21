import { CredentialAccountModel } from '@user/account/domain/models/credential-account.model';
import { CredentialAccountEntity } from '@user/account/infrastructure/entities/credential-account.entity';

export class CredentialAccountMapper {
  static toDomain(entity: CredentialAccountEntity): CredentialAccountModel {
    return CredentialAccountModel.reconstitute({
      id: entity.id,
      uuid: entity.uuid,
      accountId: entity.accountId,
      email: entity.email,
      passwordHash: entity.passwordHash,
      status: entity.status,
      emailVerifiedAt: entity.emailVerifiedAt,
      verificationBlockedUntil: entity.verificationBlockedUntil,
      createdWith: entity.createdWith,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      archivedAt: entity.archivedAt,
    });
  }

  static toEntity(model: CredentialAccountModel): Partial<CredentialAccountEntity> {
    const entity: Partial<CredentialAccountEntity> = {
      uuid: model.uuid,
      accountId: model.accountId,
      email: model.email.toLowerCase(),
      passwordHash: model.passwordHash,
      status: model.status.toString(),
      emailVerifiedAt: model.emailVerifiedAt,
      verificationBlockedUntil: model.verificationBlockedUntil,
      createdWith: model.createdWith.getValue(),
      archivedAt: model.archivedAt,
    };

    if (model.id !== undefined) {
      entity.id = model.id;
    }

    return entity;
  }
}

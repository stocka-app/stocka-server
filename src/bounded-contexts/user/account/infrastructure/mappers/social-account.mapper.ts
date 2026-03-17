import { SocialAccountModel } from '@user/account/domain/models/social-account.model';
import { SocialAccountEntity } from '@user/account/infrastructure/entities/social-account.entity';

export class SocialAccountMapper {
  static toDomain(entity: SocialAccountEntity): SocialAccountModel {
    return SocialAccountModel.reconstitute({
      id: entity.id,
      uuid: entity.uuid,
      accountId: entity.accountId,
      provider: entity.provider,
      providerId: entity.providerId,
      providerEmail: entity.providerEmail,
      linkedAt: entity.linkedAt,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      archivedAt: entity.archivedAt,
    });
  }

  static toEntity(model: SocialAccountModel): Partial<SocialAccountEntity> {
    const entity: Partial<SocialAccountEntity> = {
      uuid: model.uuid,
      accountId: model.accountId,
      provider: model.provider,
      providerId: model.providerId,
      providerEmail: model.providerEmail,
      linkedAt: model.linkedAt,
      archivedAt: model.archivedAt,
    };

    /* istanbul ignore next */
    if (model.id !== undefined) {
      entity.id = model.id;
    }

    return entity;
  }
}

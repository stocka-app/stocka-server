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
}

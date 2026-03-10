import { SocialAccountModel } from '@user/domain/models/social-account.model';
import { SocialAccountEntity } from '@user/infrastructure/persistence/entities/social-account.entity';

export class SocialAccountMapper {
  static toDomain(entity: SocialAccountEntity): SocialAccountModel {
    return SocialAccountModel.create({
      id: entity.id,
      uuid: entity.uuid,
      userId: entity.userId,
      provider: entity.provider,
      providerId: entity.providerId,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }
}

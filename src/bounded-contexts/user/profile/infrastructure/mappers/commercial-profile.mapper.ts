import { CommercialProfileModel } from '@user/profile/domain/models/commercial-profile.model';
import { CommercialProfileEntity } from '@user/profile/infrastructure/entities/commercial-profile.entity';

export class CommercialProfileMapper {
  static toDomain(entity: CommercialProfileEntity): CommercialProfileModel {
    return CommercialProfileModel.reconstitute({
      id: entity.id,
      uuid: entity.uuid,
      profileId: entity.profileId,
      fullName: entity.fullName,
      phone: entity.phone,
      countryCode: entity.countryCode,
      taxId: entity.taxId,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      archivedAt: entity.archivedAt,
    });
  }

  static toEntity(model: CommercialProfileModel): Partial<CommercialProfileEntity> {
    const entity: Partial<CommercialProfileEntity> = {
      uuid: model.uuid,
      profileId: model.profileId,
      fullName: model.fullName,
      phone: model.phone,
      countryCode: model.countryCode,
      taxId: model.taxId,
      archivedAt: model.archivedAt,
    };

    if (model.id !== undefined) {
      entity.id = model.id;
    }

    return entity;
  }
}

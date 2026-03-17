import { TenantProfileModel } from '@tenant/domain/models/tenant-profile.model';
import { TenantProfileEntity } from '@tenant/infrastructure/entities/tenant-profile.entity';

export class TenantProfileMapper {
  static toDomain(entity: TenantProfileEntity): TenantProfileModel {
    return TenantProfileModel.reconstitute({
      id: entity.id,
      uuid: entity.uuid,
      tenantId: entity.tenantId,
      giro: entity.giro,
      phone: entity.phone,
      contactEmail: entity.contactEmail,
      website: entity.website,
      addressLine1: entity.addressLine1,
      city: entity.city,
      state: entity.state,
      postalCode: entity.postalCode,
      logoUrl: entity.logoUrl,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      archivedAt: entity.archivedAt,
    });
  }

  static toEntity(model: TenantProfileModel): Partial<TenantProfileEntity> {
    const entity: Partial<TenantProfileEntity> = {
      uuid: model.uuid,
      tenantId: model.tenantId,
      giro: model.giro,
      phone: model.phone,
      contactEmail: model.contactEmail,
      website: model.website,
      addressLine1: model.addressLine1,
      city: model.city,
      state: model.state,
      postalCode: model.postalCode,
      logoUrl: model.logoUrl,
      archivedAt: model.archivedAt,
    };

    /* istanbul ignore next */
    if (model.id !== undefined) {
      entity.id = model.id;
    }

    return entity;
  }
}

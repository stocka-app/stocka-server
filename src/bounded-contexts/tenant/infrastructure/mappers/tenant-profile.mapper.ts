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
      uuid: model.uuid.toString(),
      tenantId: model.tenantId,
      giro: model.giro !== null ? model.giro.getValue() : null,
      phone: model.phone !== null ? model.phone.getValue() : null,
      contactEmail: model.contactEmail !== null ? model.contactEmail.toString() : null,
      website: model.website !== null ? model.website.getValue() : null,
      addressLine1: model.addressLine1 !== null ? model.addressLine1.getValue() : null,
      city: model.city !== null ? model.city.getValue() : null,
      state: model.state !== null ? model.state.getValue() : null,
      postalCode: model.postalCode !== null ? model.postalCode.getValue() : null,
      logoUrl: model.logoUrl !== null ? model.logoUrl.getValue() : null,
      archivedAt: model.archivedAt,
    };

    /* istanbul ignore next */
    if (model.id !== undefined) {
      entity.id = model.id;
    }

    return entity;
  }
}

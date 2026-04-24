import { TenantAggregate } from '@tenant/domain/tenant.aggregate';
import { TenantEntity } from '@tenant/infrastructure/entities/tenant.entity';

export class TenantMapper {
  static toDomain(entity: TenantEntity): TenantAggregate {
    return TenantAggregate.reconstitute({
      id: entity.id,
      uuid: entity.uuid,
      name: entity.name,
      slug: entity.slug,
      businessType: entity.businessType,
      country: entity.country,
      timezone: entity.timezone,
      status: entity.status,
      ownerUserId: entity.ownerUserId,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      archivedAt: entity.archivedAt,
    });
  }

  static toEntity(aggregate: TenantAggregate): Partial<TenantEntity> {
    const entity: Partial<TenantEntity> = {
      uuid: aggregate.uuid,
      name: aggregate.name.getValue(),
      slug: aggregate.slug,
      businessType: aggregate.businessType,
      country: aggregate.country.getValue(),
      timezone: aggregate.timezone.getValue(),
      status: aggregate.status,
      ownerUserId: aggregate.ownerUserId,
      archivedAt: aggregate.archivedAt,
    };

    /* istanbul ignore next */
    if (aggregate.id !== undefined) {
      entity.id = aggregate.id;
    }

    return entity;
  }
}

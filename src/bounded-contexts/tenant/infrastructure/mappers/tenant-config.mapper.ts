import { TenantConfigModel } from '@tenant/domain/models/tenant-config.model';
import { TenantConfigEntity } from '@tenant/infrastructure/entities/tenant-config.entity';
import { CapabilitySnapshot, isValidSnapshot } from '@shared/domain/policy/capability-snapshot';

export class TenantConfigMapper {
  static toDomain(entity: TenantConfigEntity): TenantConfigModel {
    let capabilities: CapabilitySnapshot | null = null;

    if (entity.capabilities && isValidSnapshot(entity.capabilities)) {
      capabilities = entity.capabilities;
    }

    return TenantConfigModel.reconstitute({
      id: entity.id,
      uuid: entity.uuid,
      tenantId: entity.tenantId,
      tier: entity.tier,
      maxWarehouses: entity.maxWarehouses,
      maxCustomRooms: entity.maxCustomRooms,
      maxStoreRooms: entity.maxStoreRooms,
      maxUsers: entity.maxUsers,
      maxProducts: entity.maxProducts,
      notificationsEnabled: entity.notificationsEnabled,
      productCount: entity.productCount,
      storageCount: entity.storageCount,
      memberCount: entity.memberCount,
      capabilities,
      capabilitiesBuiltAt: entity.capabilitiesBuiltAt,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      archivedAt: entity.archivedAt,
    });
  }

  static toEntity(model: TenantConfigModel): Partial<TenantConfigEntity> {
    const entity: Partial<TenantConfigEntity> = {
      uuid: model.uuid,
      tenantId: model.tenantId,
      tier: model.tier.toString(),
      maxWarehouses: model.maxWarehouses,
      maxCustomRooms: model.maxCustomRooms,
      maxStoreRooms: model.maxStoreRooms,
      maxUsers: model.maxUsers,
      maxProducts: model.maxProducts,
      notificationsEnabled: model.notificationsEnabled,
      productCount: model.productCount,
      storageCount: model.storageCount,
      memberCount: model.memberCount,
      capabilities: model.capabilities as Record<string, unknown> | null,
      capabilitiesBuiltAt: model.capabilitiesBuiltAt,
      archivedAt: model.archivedAt,
    };

    /* istanbul ignore next */
    if (model.id !== undefined) {
      entity.id = model.id;
    }

    return entity;
  }
}

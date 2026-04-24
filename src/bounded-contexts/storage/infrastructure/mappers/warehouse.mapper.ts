import { UUIDVO } from '@shared/domain/value-objects/compound/uuid.vo';
import { WarehouseModel } from '@storage/domain/models/warehouse.model';
import { StorageNameVO } from '@storage/domain/value-objects/storage-name.vo';
import { StorageDescriptionVO } from '@storage/domain/value-objects/storage-description.vo';
import { StorageIconVO } from '@storage/domain/value-objects/storage-icon.vo';
import { StorageColorVO } from '@storage/domain/value-objects/storage-color.vo';
import { StorageAddressVO } from '@storage/domain/value-objects/storage-address.vo';
import { WarehouseEntity } from '@storage/infrastructure/entities/warehouse.entity';

export class WarehouseMapper {
  static toDomain(entity: WarehouseEntity): WarehouseModel {
    return WarehouseModel.reconstitute({
      id: entity.id,
      uuid: new UUIDVO(entity.uuid),
      tenantUUID: new UUIDVO(entity.tenantUUID),
      name: new StorageNameVO(entity.name),
      description: entity.description ? new StorageDescriptionVO(entity.description) : null,
      icon: new StorageIconVO(entity.icon),
      color: new StorageColorVO(entity.color),
      address: new StorageAddressVO(entity.address),
      frozenAt: entity.frozenAt,
      archivedAt: entity.archivedAt,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  static toEntity(model: WarehouseModel, storageId?: number): Partial<WarehouseEntity> {
    const entity: Partial<WarehouseEntity> = {
      id: model.id,
      uuid: model.uuid.toString(),
      tenantUUID: model.tenantUUID.toString(),
      name: model.name.toString(),
      description: model.description?.toString() ?? null,
      icon: model.icon.toString(),
      color: model.color.toString(),
      address: model.address.toString(),
      frozenAt: model.frozenAt,
      archivedAt: model.archivedAt,
    };

    if (storageId !== undefined) {
      entity.storageId = storageId;
    }

    return entity;
  }
}
